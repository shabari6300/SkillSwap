
import { useEffect, useState } from "react";
import "./DashboardPolish.css";

function Dashboard({
  email,
  onFindMatches,
  onViewRequests,
  onViewSentRequests,
  onViewConnections,
  onLogout,
}) {
  const [teachSkill, setTeachSkill] = useState("");
  const [learnSkill, setLearnSkill] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const [stats, setStats] = useState({
    matches: 0,
    pendingRequests: 0,
    connections: 0,
  });

  const [statsMessage, setStatsMessage] = useState("Loading stats...");

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch(
          `/api/stats?email=${encodeURIComponent(email)}`,
          { credentials: "include" }
        );

        if (!response.ok) {
          setStatsMessage("Could not load stats.");
          return;
        }

        const data = await response.json();

        if (data.message === "User not found") {
          setStatsMessage("User not found.");
          return;
        }

        setStats({
          matches: data.matches || 0,
          pendingRequests: data.pendingRequests || 0,
          connections: data.connections || 0,
        });

        setStatsMessage("");
      } catch (error) {
        console.error("Stats loading error:", error);
        setStatsMessage("Could not connect to the server.");
      }
    };

    if (email) {
      loadStats();
    }
  }, [email]);

  const handleSaveSkills = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/users/skills", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          teachSkill,
          learnSkill,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message || "Skills saved successfully.");
        setMessageType("success");
      } else {
        setMessage(result.message || "Failed to save skills.");
        setMessageType("error");
      }
    } catch (error) {
      console.error("Save skills error:", error);
      setMessage("Could not connect to the server.");
      setMessageType("error");
    }
  };

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-eyebrow">
          YOUR SKILLS. YOUR COMMUNITY.
        </div>

        <h1>
          Welcome to SkillSwap <span>👋</span>
        </h1>

        <p className="logged-user">
          Logged in as <strong>{email}</strong>
        </p>
      </header>

      {statsMessage && (
        <p className="dashboard-stats-message" role="status">
          {statsMessage}
        </p>
      )}

      <section className="stats-grid" aria-label="Your SkillSwap statistics">
        <article className="stat-card stat-purple">
          <div className="stat-icon">🔎</div>
          <div className="stat-content">
            <span>Matches</span>
            <strong>{stats.matches}</strong>
            <small>People to learn with</small>
          </div>
        </article>

        <article className="stat-card stat-pink">
          <div className="stat-icon">📩</div>
          <div className="stat-content">
            <span>Pending Requests</span>
            <strong>{stats.pendingRequests}</strong>
            <small>Waiting for your response</small>
          </div>
        </article>

        <article className="stat-card stat-cyan">
          <div className="stat-icon">🤝</div>
          <div className="stat-content">
            <span>Connections</span>
            <strong>{stats.connections}</strong>
            <small>Your learning community</small>
          </div>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="dashboard-card dashboard-profile-card">
          <div className="dashboard-card-heading">
            <div className="dashboard-card-icon">✨</div>
            <div>
              <h2>Your Skill Profile</h2>
              <p className="card-description">
                Share what you can teach and what you want to learn.
              </p>
            </div>
          </div>

          <form
            className="dashboard-skill-form"
            onSubmit={handleSaveSkills}
          >
            <div className="dashboard-field">
              <label htmlFor="teach-skill">
                Skill I can teach
              </label>
              <input
                id="teach-skill"
                type="text"
                placeholder="Example: Java"
                value={teachSkill}
                onChange={(event) => setTeachSkill(event.target.value)}
                required
              />
            </div>

            <div className="dashboard-field">
              <label htmlFor="learn-skill">
                Skill I want to learn
              </label>
              <input
                id="learn-skill"
                type="text"
                placeholder="Example: UI/UX Design"
                value={learnSkill}
                onChange={(event) => setLearnSkill(event.target.value)}
                required
              />
            </div>

            <button
              className="primary-button"
              type="submit"
            >
              Save Skills <span aria-hidden="true">→</span>
            </button>
          </form>

          {message && (
            <div
              className={`dashboard-feedback ${
                messageType === "error"
                  ? "dashboard-feedback-error"
                  : "dashboard-feedback-success"
              }`}
              role={messageType === "error" ? "alert" : "status"}
            >
              {message}
            </div>
          )}

          <div className="dashboard-tip">
            <span>💡</span>
            <p>
              Every great connection starts with sharing what you know.
            </p>
          </div>
        </article>

        <article className="dashboard-card dashboard-explore-card">
          <div className="dashboard-card-heading">
            <div className="dashboard-card-icon">🚀</div>
            <div>
              <h2>Explore SkillSwap</h2>
              <p className="card-description">
                Find people, manage your requests, and connect with
                your matches.
              </p>
            </div>
          </div>

          <div className="dashboard-actions">
            <button
              className="action-button"
              onClick={onFindMatches}
            >
              <span className="dashboard-action-icon">🔎</span>
              <span className="dashboard-action-copy">
                <strong>Find Matches</strong>
                <small>Discover compatible learners</small>
              </span>
              <span className="dashboard-action-arrow">→</span>
            </button>

            <button
              className="action-button"
              onClick={onViewRequests}
            >
              <span className="dashboard-action-icon">📩</span>
              <span className="dashboard-action-copy">
                <strong>Swap Requests</strong>
                <small>Review received requests</small>
              </span>
              <span className="dashboard-action-arrow">→</span>
            </button>

            <button
              className="action-button"
              onClick={onViewSentRequests}
            >
              <span className="dashboard-action-icon">📤</span>
              <span className="dashboard-action-copy">
                <strong>Sent Requests</strong>
                <small>Track your invitations</small>
              </span>
              <span className="dashboard-action-arrow">→</span>
            </button>

            <button
              className="action-button"
              onClick={onViewConnections}
            >
              <span className="dashboard-action-icon">🤝</span>
              <span className="dashboard-action-copy">
                <strong>My Connections</strong>
                <small>Meet your learning partners</small>
              </span>
              <span className="dashboard-action-arrow">→</span>
            </button>
          </div>

          <div className="dashboard-community-note">
            <span>🌱</span>
            <p>
              Learn together. Exchange knowledge. Grow at your own pace.
            </p>
          </div>
        </article>
      </section>

      <footer className="dashboard-footer">
        <span>SkillSwap</span>
        <span>Learn. Teach. Connect.</span>
        <button
          type="button"
          className="dashboard-logout"
          onClick={onLogout}
        >
          Logout
        </button>
      </footer>
    </main>
  );
}

export default Dashboard;
