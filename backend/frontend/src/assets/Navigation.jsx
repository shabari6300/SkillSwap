function Navigation({
  onHome,
  onMatches,
  onRequests,
  onSentRequests,
  onConnections,
  onProfile,
  onNotifications,
  notificationCount,
  onLogout,
}) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        SkillSwap
      </div>

      <div className="navbar-links">
        <button onClick={onHome}>
          Home
        </button>

        <button onClick={onMatches}>
          Matches
        </button>

        <button onClick={onRequests}>
          Requests
        </button>

        <button onClick={onSentRequests}>
          Sent Requests
        </button>

        <button onClick={onConnections}>
          Connections
        </button>

        <button onClick={onProfile}>
          Profile
        </button>

        <button
          className="activity-button"
          onClick={onNotifications}
        >
          Activity

          {notificationCount > 0 && (
            <span className="notification-badge">
              {notificationCount}
            </span>
          )}
        </button>

        <button
          className="logout-button"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navigation;