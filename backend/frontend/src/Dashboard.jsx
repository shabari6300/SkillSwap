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

  const [stats, setStats] = useState({
    matches: 0,
    pendingRequests: 0,
    connections: 0,
  });

  const [statsMessage, setStatsMessage] = useState(
    "Loading stats..."
  );

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
        setStatsMessage("Could not connect to the server.");
      }
    };

    loadStats();
  }, [email]);

  const handleSaveSkills = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("/api/users/skills", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          teachSkill: teachSkill,
          learnSkill: learnSkill,
        }),
      });

      const result = await response.text();

      if (response.ok) {
        setMessage(result);
      } else {
        setMessage("Failed to save skills.");
      }
    } catch (error) {
      setMessage("Could not connect to the server.");
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
        <p className="dashboard-stats-message">
          {statsMessage}
        </p>
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
            Tell the community what you can teach and what
            you want to learn.
          </p>

          <form onSubmit={handleSaveSkills}>
            <label>Skill I can teach</label>

            <input
              type="text"
              placeholder="Example: Java"
              value={teachSkill}
              onChange={(event) =>
                setTeachSkill(event.target.value)
              }
              required
            />

            <label>Skill I want to learn</label>

            <input
              type="text"
              placeholder="Example: UI/UX Design"
              value={learnSkill}
              onChange={(event) =>
                setLearnSkill(event.target.value)
              }
              required
            />

            <button
              className="primary-button"
              type="submit"
            >
              Save Skills
            </button>
          </form>

          {message && (
            <p className="success-message">
              {message}
            </p>
          )}
        </div>

        <div className="dashboard-card">
          <h2>Explore SkillSwap</h2>

          <p className="card-description">
            Find people, manage swap requests and connect
            with your matches.
          </p>

          <button
            className="action-button"
            onClick={onFindMatches}
          >
            🔎 Find Matches
          </button>

          <button
            className="action-button"
            onClick={onViewRequests}
          >
            📩 Swap Requests
          </button>

          <button
            className="action-button"
            onClick={onViewSentRequests}
          >
            📤 Sent Requests
          </button>

          <button
            className="action-button"
            onClick={onViewConnections}
          >
            🤝 My Connections
          </button>
        </div>
      </div>

      <button
        className="dashboard-logout"
        onClick={onLogout}
      >
        Logout
      </button>
    </div>
  );
}

export default Dashboard;