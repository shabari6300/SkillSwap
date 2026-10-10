
import { useCallback, useEffect, useState } from "react";
import "./SkillJourney.css";

const EMPTY_FORM = {
  title: "",
  skillName: "",
  goalDescription: "",
  targetDate: "",
};

async function readApiResponse(response) {
  if (response.status === 204) {
    return null;
  }

  let data = null;

  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(`Request failed (${response.status}).`);
    }
    return null;
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      `Request failed (${response.status}).`
    );
  }

  return data;
}

function todayString() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(dateString) {
  if (!dateString) {
    return "No deadline";
  }

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function JourneyCard({
  journey,
  onAddMilestone,
  onToggleMilestone,
  onDelete,
  busy,
}) {
  const [milestoneForm, setMilestoneForm] = useState({
    title: "",
    description: "",
    targetDate: "",
  });

  const [savingMilestone, setSavingMilestone] = useState(false);

  const milestones = journey.milestones || [];

  const progress = Math.max(
    0,
    Math.min(100, Number(journey.progressPercent) || 0)
  );

  const completedCount = milestones.filter(
    (milestone) => milestone.completed
  ).length;

  const handleMilestoneSubmit = async (event) => {
    event.preventDefault();

    setSavingMilestone(true);

    try {
      const success = await onAddMilestone(journey.id, {
        title: milestoneForm.title.trim(),
        description: milestoneForm.description.trim(),
        targetDate: milestoneForm.targetDate || null,
      });

      if (success) {
        setMilestoneForm({
          title: "",
          description: "",
          targetDate: "",
        });
      }
    } finally {
      setSavingMilestone(false);
    }
  };

  return (
    <article className="sj-card">
      <div className="sj-card-header">
        <div className="sj-title-area">
          <span className="sj-skill-label">
            {journey.skillName}
          </span>

          <h3>{journey.title}</h3>

          {journey.goalDescription && (
            <p className="sj-description">
              {journey.goalDescription}
            </p>
          )}
        </div>

        <span
          className={`sj-status ${
            journey.status === "COMPLETED"
              ? "sj-status-completed"
              : "sj-status-progress"
          }`}
        >
          {journey.status === "COMPLETED"
            ? "Completed"
            : "In progress"}
        </span>
      </div>

      <div className="sj-progress-info">
        <span>Learning progress</span>
        <strong>{progress}%</strong>
      </div>

      <div
        className="sj-progress-track"
        role="progressbar"
        aria-label={`${journey.title} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
      >
        <div
          className="sj-progress-fill"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="sj-card-meta">
        <span>
          🎯 Target: {formatDate(journey.targetDate)}
        </span>

        <span>
          ✅ {completedCount} of {milestones.length} milestones
        </span>
      </div>

      <div className="sj-divider" />

      <div className="sj-section-title">
        <h4>Learning milestones</h4>
        <span>{milestones.length}</span>
      </div>

      {milestones.length === 0 ? (
        <p className="sj-muted">
          No milestones yet. Add your first learning milestone below.
        </p>
      ) : (
        <div className="sj-milestone-list">
          {milestones.map((milestone) => (
            <div
              className={`sj-milestone ${
                milestone.completed ? "is-completed" : ""
              }`}
              key={milestone.id}
            >
              <button
                type="button"
                className={`sj-milestone-check ${
                  milestone.completed ? "checked" : ""
                }`}
                aria-label={
                  milestone.completed
                    ? `Mark ${milestone.title} incomplete`
                    : `Mark ${milestone.title} complete`
                }
                disabled={busy}
                onClick={() =>
                  onToggleMilestone(journey, milestone)
                }
              >
                {milestone.completed ? "✓" : ""}
              </button>

              <div className="sj-milestone-content">
                <div className="sj-milestone-title">
                  {milestone.title}
                </div>

                {milestone.description && (
                  <p>{milestone.description}</p>
                )}

                {milestone.targetDate && (
                  <small>
                    Target: {formatDate(milestone.targetDate)}
                  </small>
                )}
              </div>

              <span
                className={`sj-milestone-state ${
                  milestone.completed ? "done" : ""
                }`}
              >
                {milestone.completed ? "Done" : "Pending"}
              </span>
            </div>
          ))}
        </div>
      )}

      {journey.status !== "COMPLETED" && (
        <form
          className="sj-milestone-form"
          onSubmit={handleMilestoneSubmit}
        >
          <h4>Add a milestone</h4>

          <label>
            Milestone title
            <input
              type="text"
              value={milestoneForm.title}
              onChange={(event) =>
                setMilestoneForm({
                  ...milestoneForm,
                  title: event.target.value,
                })
              }
              maxLength={120}
              placeholder="e.g. Complete Java collections"
              required
            />
          </label>

          <label>
            Description (optional)
            <textarea
              value={milestoneForm.description}
              onChange={(event) =>
                setMilestoneForm({
                  ...milestoneForm,
                  description: event.target.value,
                })
              }
              maxLength={600}
              rows={2}
              placeholder="What do you want to accomplish?"
            />
          </label>

          <label>
            Target date (optional)
            <input
              type="date"
              min={todayString()}
              value={milestoneForm.targetDate}
              onChange={(event) =>
                setMilestoneForm({
                  ...milestoneForm,
                  targetDate: event.target.value,
                })
              }
            />
          </label>

          <button
            type="submit"
            className="sj-button sj-button-secondary"
            disabled={savingMilestone || busy}
          >
            {savingMilestone ? "Adding..." : "+ Add milestone"}
          </button>
        </form>
      )}

      {journey.status === "COMPLETED" && (
        <div className="sj-completion-message">
          🏆 All milestones completed! Great work.
        </div>
      )}

      <button
        type="button"
        className="sj-delete-button"
        disabled={busy}
        onClick={() => onDelete(journey)}
      >
        Delete journey
      </button>
    </article>
  );
}

function SkillJourney({ email }) {
  const [journeys, setJourneys] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [savingJourney, setSavingJourney] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadJourneys = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/skill-journeys", {
        method: "GET",
        credentials: "include",
      });

      const data = await readApiResponse(response);

      setJourneys(Array.isArray(data) ? data : []);
    } catch (requestError) {
      setError(
        requestError.message || "Could not load your learning journeys."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJourneys();
  }, [loadJourneys, email]);

  const replaceJourney = (updatedJourney) => {
    setJourneys((current) =>
      current.map((journey) =>
        journey.id === updatedJourney.id
          ? updatedJourney
          : journey
      )
    );
  };

  const handleCreateJourney = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSavingJourney(true);

    try {
      const response = await fetch("/api/skill-journeys", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title.trim(),
          skillName: form.skillName.trim(),
          goalDescription: form.goalDescription.trim(),
          targetDate: form.targetDate || null,
        }),
      });

      const createdJourney = await readApiResponse(response);

      setJourneys((current) => [
        createdJourney,
        ...current.filter(
          (journey) => journey.id !== createdJourney.id
        ),
      ]);

      setForm(EMPTY_FORM);
      setSuccess("Your learning journey has been created!");
    } catch (requestError) {
      setError(
        requestError.message || "Could not create the journey."
      );
    } finally {
      setSavingJourney(false);
    }
  };

  const handleAddMilestone = async (journeyId, payload) => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        `/api/skill-journeys/${journeyId}/milestones`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const updatedJourney = await readApiResponse(response);
      replaceJourney(updatedJourney);
      setSuccess("Milestone added successfully.");

      return true;
    } catch (requestError) {
      setError(
        requestError.message || "Could not add the milestone."
      );

      return false;
    }
  };

  const handleToggleMilestone = async (journey, milestone) => {
    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const response = await fetch(
        `/api/skill-journeys/${journey.id}/milestones/${milestone.id}/completion`,
        {
          method: "PUT",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            completed: !milestone.completed,
          }),
        }
      );

      const updatedJourney = await readApiResponse(response);
      replaceJourney(updatedJourney);

      setSuccess(
        milestone.completed
          ? "Milestone marked as incomplete."
          : "Milestone completed! Keep going."
      );
    } catch (requestError) {
      setError(
        requestError.message || "Could not update the milestone."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteJourney = async (journey) => {
    const confirmed = window.confirm(
      `Delete "${journey.title}" and all its milestones? This cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setBusy(true);

    try {
      const response = await fetch(
        `/api/skill-journeys/${journey.id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      await readApiResponse(response);

      setJourneys((current) =>
        current.filter((item) => item.id !== journey.id)
      );

      setSuccess("Learning journey deleted.");
    } catch (requestError) {
      setError(
        requestError.message || "Could not delete the journey."
      );
    } finally {
      setBusy(false);
    }
  };

  const completedJourneys = journeys.filter(
    (journey) => journey.status === "COMPLETED"
  ).length;

  const completedMilestones = journeys.reduce(
    (total, journey) =>
      total +
      (journey.milestones || []).filter(
        (milestone) => milestone.completed
      ).length,
    0
  );

  return (
    <main className="skill-journey-page">
      <header className="sj-hero">
        <div className="sj-eyebrow">
          YOUR PERSONAL LEARNING SPACE
        </div>

        <h1>Skill Journey</h1>

        <p>
          Turn your learning goals into milestones.
          Track your progress, celebrate your achievements,
          and keep growing one step at a time.
        </p>
      </header>

      <section className="sj-stats">
        <div className="sj-stat-card">
          <span className="sj-stat-icon">🎯</span>
          <div>
            <strong>{journeys.length}</strong>
            <span>Learning journeys</span>
          </div>
        </div>

        <div className="sj-stat-card">
          <span className="sj-stat-icon">✅</span>
          <div>
            <strong>{completedMilestones}</strong>
            <span>Milestones completed</span>
          </div>
        </div>

        <div className="sj-stat-card">
          <span className="sj-stat-icon">🏆</span>
          <div>
            <strong>{completedJourneys}</strong>
            <span>Goals achieved</span>
          </div>
        </div>
      </section>

      {error && (
        <div className="sj-message sj-message-error" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="sj-message sj-message-success" role="status">
          {success}
        </div>
      )}

      <div className="sj-main-grid">
        <section className="sj-create-panel">
          <div className="sj-panel-heading">
            <span className="sj-heading-icon">✨</span>
            <div>
              <h2>Start a new journey</h2>
              <p>Define what you want to learn.</p>
            </div>
          </div>

          <form
            className="sj-create-form"
            onSubmit={handleCreateJourney}
          >
            <label>
              Journey title
              <input
                type="text"
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                maxLength={120}
                placeholder="e.g. Become confident in Java"
                required
              />
            </label>

            <label>
              Skill you want to learn
              <input
                type="text"
                value={form.skillName}
                onChange={(event) =>
                  setForm({ ...form, skillName: event.target.value })
                }
                maxLength={100}
                placeholder="e.g. Java, SQL, Cloud"
                required
              />
            </label>

            <label>
              Your goal
              <textarea
                value={form.goalDescription}
                onChange={(event) =>
                  setForm({
                    ...form,
                    goalDescription: event.target.value,
                  })
                }
                maxLength={1000}
                rows={4}
                placeholder="Describe what you want to achieve..."
              />
            </label>

            <label>
              Target date (optional)
              <input
                type="date"
                min={todayString()}
                value={form.targetDate}
                onChange={(event) =>
                  setForm({ ...form, targetDate: event.target.value })
                }
              />
            </label>

            <button
              type="submit"
              className="sj-button sj-button-primary"
              disabled={savingJourney}
            >
              {savingJourney
                ? "Creating..."
                : "＋ Create learning journey"}
            </button>
          </form>

          <div className="sj-tip">
            <span>💡</span>
            <p>
              Break a large goal into small milestones.
              Complete each one to see your progress grow.
            </p>
          </div>
        </section>

        <section className="sj-journeys-panel">
          <div className="sj-journeys-heading">
            <div>
              <h2>Your learning journeys</h2>
              <p>Keep track of every step forward.</p>
            </div>

            <button
              type="button"
              className="sj-refresh-button"
              onClick={loadJourneys}
              disabled={loading}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          {loading ? (
            <div className="sj-empty-state">
              <span>⏳</span>
              <h3>Loading your journeys...</h3>
              <p>Please wait while we fetch your progress.</p>
            </div>
          ) : journeys.length === 0 ? (
            <div className="sj-empty-state">
              <span>🌱</span>
              <h3>Your learning journey starts here</h3>
              <p>
                Create your first learning goal, then add milestones
                to track your progress.
              </p>
            </div>
          ) : (
            <div className="sj-journey-list">
              {journeys.map((journey) => (
                <JourneyCard
                  key={journey.id}
                  journey={journey}
                  onAddMilestone={handleAddMilestone}
                  onToggleMilestone={handleToggleMilestone}
                  onDelete={handleDeleteJourney}
                  busy={busy}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default SkillJourney;
