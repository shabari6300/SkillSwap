import { useEffect, useState } from "react";

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
          `/api/stats?email=${encodeURIComponent(email)}`
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

    loadStats();
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
          email: email,
          teachSkill: teachSkill,
          learnSkill: learnSkill,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(result.message || "Skills saved successfully");
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
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Welcome to SkillSwap 👋</h1>

        <p className="logged-user">
          Logged in as <strong>{email}</strong>
        </p>
      </div>

      {statsMessage && (
        <p className="dashboard-stats-message">{statsMessage}</p>
      )}

      <div className="stats-grid">
        <div className="stat-card stat-purple">
          <div className="stat-icon">🔎</div>
          <div>
            <span>Matches</span>
            <strong>{stats.matches}</strong>
          </div>
        </div>

        <div className="stat-card stat-pink">
          <div className="stat-icon">📩</div>
          <div>
            <span>Pending Requests</span>
            <strong>{stats.pendingRequests}</strong>
          </div>
        </div>

        <div className="stat-card stat-cyan">
          <div className="stat-icon">🤝</div>
          <div>
            <span>Connections</span>
            <strong>{stats.connections}</strong>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h2>Your Skill Profile</h2>

          <p className="card-description">
            Tell the community what you can teach and what you want to learn.
          </p>

          <form onSubmit={handleSaveSkills}>
            <label>Skill I can teach</label>

            <input
              type="text"
              placeholder="Example: Java"
              value={teachSkill}
              onChange={(event) => setTeachSkill(event.target.value)}
              required
            />

            <label>Skill I want to learn</label>

            <input
              type="text"
              placeholder="Example: UI/UX Design"
              value={learnSkill}
              onChange={(event) => setLearnSkill(event.target.value)}
              required
            />

            <button className="primary-button" type="submit">
              Save Skills
            </button>
          </form>

          {message && (
            <p
              className="success-message"
              style={{
                color: messageType === "error" ? "#ff6b6b" : "#63f5a0",
                background:
                  messageType === "error"
                    ? "rgba(255, 70, 70, 0.12)"
                    : "rgba(70, 220, 150, 0.12)",
                border:
                  messageType === "error"
                    ? "1px solid rgba(255, 70, 70, 0.25)"
                    : "1px solid rgba(70, 220, 150, 0.25)",
                padding: "14px 16px",
                borderRadius: "12px",
                fontWeight: "600",
              }}
            >
              {message}
            </p>
          )}
        </div>

        <div className="dashboard-card">
          <h2>Explore SkillSwap</h2>

          <p className="card-description">
            Find people, manage swap requests and connect with your matches.
          </p>

          <button className="action-button" onClick={onFindMatches}>
            🔎 Find Matches
          </button>

          <button className="action-button" onClick={onViewRequests}>
            📩 Swap Requests
          </button>

          <button className="action-button" onClick={onViewSentRequests}>
            📤 Sent Requests
          </button>

          <button className="action-button" onClick={onViewConnections}>
            🤝 My Connections
          </button>
        </div>
      </div>

      <button className="dashboard-logout" onClick={onLogout}>
        Logout
      </button>
    </div>
  );
}

export default Dashboard;