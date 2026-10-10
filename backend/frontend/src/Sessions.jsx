
import { useEffect, useState } from "react";
import "./Sessions.css";

function getLocalDateTimeValue(date = new Date()) {
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );

  return localDate.toISOString().slice(0, 16);
}

function Sessions({ email }) {
  const [connections, setConnections] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [partnerEmail, setPartnerEmail] = useState("");
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [notes, setNotes] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busySessionId, setBusySessionId] = useState(null);

  const showMessage = (text, type = "error") => {
    setMessage(text);
    setMessageType(type);
  };

  const readResponse = async (response) => {
    const text = await response.text();

    if (!text) return {};

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  };

  const loadData = async (showLoading = true) => {
    if (!email) {
      setLoading(false);
      return;
    }

    if (showLoading) setLoading(true);

    try {
      const [
        sentResponse,
        receivedResponse,
        sessionsResponse,
      ] = await Promise.all([
        fetch("/api/swap-requests/sent", {
          credentials: "include",
        }),
        fetch("/api/swap-requests/received", {
          credentials: "include",
        }),
        fetch("/api/sessions", {
          credentials: "include",
        }),
      ]);

      if (
        !sentResponse.ok ||
        !receivedResponse.ok ||
        !sessionsResponse.ok
      ) {
        throw new Error(
          "Could not load your sessions or connections."
        );
      }

      const sentRequests = await sentResponse.json();
      const receivedRequests = await receivedResponse.json();
      const mySessions = await sessionsResponse.json();

      const acceptedConnections = [
        ...sentRequests
          .filter((request) => request.status === "ACCEPTED")
          .map((request) => request.receiverEmail),

        ...receivedRequests
          .filter((request) => request.status === "ACCEPTED")
          .map((request) => request.requesterEmail),
      ];

      const uniqueConnections = [
        ...new Map(
          acceptedConnections
            .filter(
              (address) =>
                address &&
                address.toLowerCase() !== email.toLowerCase()
            )
            .map((address) => [
              address.toLowerCase(),
              address,
            ])
        ).values(),
      ];

      setConnections(uniqueConnections);
      setSessions(mySessions);

      setPartnerEmail((currentPartner) => {
        if (
          currentPartner &&
          !uniqueConnections.some(
            (address) =>
              address.toLowerCase() ===
              currentPartner.toLowerCase()
          )
        ) {
          return "";
        }

        return currentPartner;
      });
    } catch (error) {
      console.error("Session loading failed:", error);

      showMessage(
        "Could not load sessions. Please refresh and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [email]);

  const createSession = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          partnerEmail,
          title: title.trim(),
          skill: skill.trim(),
          scheduledAt,
          durationMinutes: Number(durationMinutes),
          notes: notes.trim(),
        }),
      });

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          result.message || "Could not create the session."
        );
      }

      setTitle("");
      setSkill("");
      setScheduledAt("");
      setDurationMinutes("30");
      setNotes("");

      showMessage(
        "Session invitation created successfully!",
        "success"
      );

      await loadData(false);
    } catch (error) {
      console.error("Session creation failed:", error);

      showMessage(
        error.message || "Could not connect to the server."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const updateSession = async (sessionId, action) => {
    setBusySessionId(sessionId);
    setMessage("");
    setMessageType("");

    try {
      const response = await fetch(
        `/api/sessions/${sessionId}/${action}`,
        {
          method: "PUT",
          credentials: "include",
        }
      );

      const result = await readResponse(response);

      if (!response.ok) {
        throw new Error(
          result.message || `Could not ${action} this session.`
        );
      }

      showMessage(
        action === "accept"
          ? "Session accepted!"
          : action === "cancel"
            ? "Session cancelled."
            : "Session marked as completed!",
        "success"
      );

      await loadData(false);
    } catch (error) {
      console.error("Session update failed:", error);

      showMessage(
        error.message || "Could not update this session."
      );
    } finally {
      setBusySessionId(null);
    }
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return "Date unavailable";

    const date = new Date(
      dateValue.length === 16
        ? `${dateValue}:00`
        : dateValue
    );

    if (Number.isNaN(date.getTime())) {
      return dateValue;
    }

    return date.toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const canComplete = (session) => {
    if (
      session.status !== "ACCEPTED" ||
      !session.scheduledAt ||
      !session.durationMinutes
    ) {
      return false;
    }

    const start = new Date(
      session.scheduledAt.length === 16
        ? `${session.scheduledAt}:00`
        : session.scheduledAt
    );

    if (Number.isNaN(start.getTime())) return false;

    const end = new Date(
      start.getTime() + session.durationMinutes * 60000
    );

    return end <= new Date();
  };

  const getOtherParticipant = (session) => {
    return session.organizerEmail.toLowerCase() ===
      email.toLowerCase()
      ? session.partnerEmail
      : session.organizerEmail;
  };

  const statusClass = (status) => {
    const classes = {
      PENDING: "session-status--pending",
      ACCEPTED: "session-status--accepted",
      COMPLETED: "session-status--completed",
      CANCELLED: "session-status--cancelled",
    };

    return classes[status] || "session-status--pending";
  };

  return (
    <main className="page-container sessions-page">
      <header className="sessions-hero">
        <span className="sessions-eyebrow">
          <span aria-hidden="true">✦</span>
          Learn together
        </span>

        <h1>Skill Sessions</h1>

        <p>
          Plan your next learning session, exchange knowledge,
          and keep moving towards your goals.
        </p>
      </header>

      {message && (
        <div
          className={`sessions-feedback sessions-feedback--${
            messageType === "success" ? "success" : "error"
          }`}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      )}

      <div className="sessions-layout">
        <section className="sessions-card">
          <div className="sessions-section-heading">
            <h2>Schedule a session</h2>
            <p>
              Create a learning invitation for an accepted
              SkillSwap connection.
            </p>
          </div>

          <form className="sessions-form" onSubmit={createSession}>
            <div className="sessions-form-grid">
              <div className="sessions-field-group sessions-field-group--full">
                <label htmlFor="session-partner">
                  Learning partner
                </label>

                <select
                  id="session-partner"
                  className="session-field"
                  value={partnerEmail}
                  onChange={(event) =>
                    setPartnerEmail(event.target.value)
                  }
                  required
                >
                  <option value="">
                    Select an accepted connection
                  </option>

                  {connections.map((address) => (
                    <option key={address} value={address}>
                      {address}
                    </option>
                  ))}
                </select>

                {connections.length === 0 && (
                  <p className="sessions-field-hint">
                    You need an accepted connection before
                    scheduling a session.
                  </p>
                )}
              </div>

              <div className="sessions-field-group">
                <label htmlFor="session-title">
                  Session title
                </label>

                <input
                  id="session-title"
                  className="session-field"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Java OOP practice"
                  maxLength={100}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="sessions-field-group">
                <label htmlFor="session-skill">
                  Skill
                </label>

                <input
                  id="session-skill"
                  className="session-field"
                  type="text"
                  value={skill}
                  onChange={(event) => setSkill(event.target.value)}
                  placeholder="e.g. Java, SQL"
                  maxLength={100}
                  autoComplete="off"
                  required
                />
              </div>

              <div className="sessions-field-group sessions-field-group--full">
                <label htmlFor="session-time">
                  Date and time
                </label>

                <input
                  id="session-time"
                  className="session-field"
                  type="datetime-local"
                  value={scheduledAt}
                  min={getLocalDateTimeValue()}
                  onChange={(event) =>
                    setScheduledAt(event.target.value)
                  }
                  required
                />
              </div>

              <div className="sessions-field-group sessions-field-group--full">
                <label htmlFor="session-duration">
                  Session duration
                </label>

                <select
                  id="session-duration"
                  className="session-field"
                  value={durationMinutes}
                  onChange={(event) =>
                    setDurationMinutes(event.target.value)
                  }
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1 hour 30 minutes</option>
                  <option value="120">2 hours</option>
                  <option value="240">4 hours</option>
                </select>
              </div>

              <div className="sessions-field-group sessions-field-group--full">
                <label htmlFor="session-notes">
                  Session agenda
                  <span className="sessions-field-hint">
                    {" "}(optional)
                  </span>
                </label>

                <textarea
                  id="session-notes"
                  className="session-field"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What would you like to learn or practise?"
                  maxLength={2000}
                  rows={4}
                />
              </div>
            </div>

            <button
              type="submit"
              className="sessions-button sessions-button--primary sessions-form-submit"
              disabled={
                submitting ||
                connections.length === 0 ||
                !scheduledAt
              }
            >
              {submitting
                ? "Creating invitation..."
                : "✦  Send session invitation"}
            </button>
          </form>
        </section>

        <section className="sessions-card">
          <div className="sessions-list-header">
            <div className="sessions-section-heading">
              <h2>Your sessions</h2>
              <p>
                View invitations and track your learning sessions.
              </p>
            </div>

            <button
              type="button"
              className="sessions-button sessions-button--secondary"
              onClick={() => loadData()}
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="sessions-loading">
              Loading your sessions...
            </div>
          ) : sessions.length === 0 ? (
            <div className="sessions-empty">
              <div className="sessions-empty-icon" aria-hidden="true">
                ▦
              </div>

              <h3>No sessions yet</h3>

              <p>
                Your learning calendar is ready. Create an
                invitation to get your first session started.
              </p>
            </div>
          ) : (
            <div className="sessions-list">
              {sessions.map((session) => {
                const participant = getOtherParticipant(session);

                const isInvitee =
                  session.partnerEmail.toLowerCase() ===
                  email.toLowerCase();

                return (
                  <article className="session-item" key={session.id}>
                    <div className="session-item-top">
                      <div className="session-item-title">
                        <h3>{session.title}</h3>

                        <p>
                          With {participant}
                        </p>
                      </div>

                      <span
                        className={`session-status ${statusClass(
                          session.status
                        )}`}
                      >
                        {session.status}
                      </span>
                    </div>

                    <div className="session-details">
                      <div className="session-detail">
                        <span className="session-detail-label">
                          Skill
                        </span>

                        <span className="session-detail-value">
                          {session.skill}
                        </span>
                      </div>

                      <div className="session-detail">
                        <span className="session-detail-label">
                          Duration
                        </span>

                        <span className="session-detail-value">
                          {session.durationMinutes} minutes
                        </span>
                      </div>

                      <div className="session-detail">
                        <span className="session-detail-label">
                          Date & time
                        </span>

                        <span className="session-detail-value">
                          {formatDate(session.scheduledAt)}
                        </span>
                      </div>

                      <div className="session-detail">
                        <span className="session-detail-label">
                          Organized by
                        </span>

                        <span className="session-detail-value">
                          {session.organizerEmail.toLowerCase() ===
                          email.toLowerCase()
                            ? "You"
                            : session.organizerEmail}
                        </span>
                      </div>
                    </div>

                    {session.notes && (
                      <p className="session-notes">
                        <strong>Agenda:</strong> {session.notes}
                      </p>
                    )}

                    <div className="session-item-actions">
                      {session.status === "PENDING" &&
                        isInvitee && (
                          <button
                            type="button"
                            className="sessions-button sessions-button--primary"
                            disabled={busySessionId === session.id}
                            onClick={() =>
                              updateSession(session.id, "accept")
                            }
                          >
                            {busySessionId === session.id
                              ? "Please wait..."
                              : "Accept invitation"}
                          </button>
                        )}

                      {(session.status === "PENDING" ||
                        session.status === "ACCEPTED") && (
                        <button
                          type="button"
                          className="sessions-button sessions-button--danger"
                          disabled={busySessionId === session.id}
                          onClick={() =>
                            updateSession(session.id, "cancel")
                          }
                        >
                          Cancel session
                        </button>
                      )}

                      {canComplete(session) && (
                        <button
                          type="button"
                          className="sessions-button sessions-button--secondary"
                          disabled={busySessionId === session.id}
                          onClick={() =>
                            updateSession(session.id, "complete")
                          }
                        >
                          Mark completed
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default Sessions;
