import "./App.css";
import { useEffect, useState } from "react";

import Register from "./Register";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Matches from "./Matches";
import Requests from "./Requests";
import SentRequests from "./SentRequests";
import Connections from "./Connections";
import Chat from "./Chat";
import Profile from "./Profile";
import Notifications from "./Notifications";
import Navigation from "./Navigation";

function App() {
  const [page, setPage] = useState("home");
  const [userEmail, setUserEmail] = useState("");
  const [connectionEmail, setConnectionEmail] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);

  /*
   * Check whether the Spring Security session already exists.
   * This runs when the app loads or when the browser is refreshed.
   */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch("/api/users/me", {
          method: "GET",
          credentials: "include",
        });

        if (response.ok) {
          const user = await response.json();

          setUserEmail(user.email);
          setPage("dashboard");
        } else {
          setUserEmail("");
          setPage("home");
        }
      } catch (error) {
        console.error("Session check failed:", error);
        setUserEmail("");
        setPage("home");
      } finally {
        setCheckingSession(false);
      }
    };

    restoreSession();
  }, []);

  /*
   * Load the number of pending requests.
   */
  const loadNotificationCount = async (email) => {
    if (!email) {
      setNotificationCount(0);
      return;
    }

    try {
      const response = await fetch(
        `/api/swap-requests/received?email=${encodeURIComponent(email)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        return;
      }

      const requests = await response.json();

      const pendingCount = requests.filter(
        (request) => request.status === "PENDING"
      ).length;

      setNotificationCount(pendingCount);
    } catch (error) {
      console.error("Notification count error:", error);
      setNotificationCount(0);
    }
  };

  /*
   * Keep the notification count updated.
   */
  useEffect(() => {
    if (!userEmail) {
      setNotificationCount(0);
      return;
    }

    loadNotificationCount(userEmail);

    const interval = setInterval(() => {
      loadNotificationCount(userEmail);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [userEmail]);

  /*
   * Called after successful login.
   */
  const handleLogin = (email) => {
    setUserEmail(email);
    setPage("dashboard");
  };

  /*
   * Logout from the actual Spring Security session.
   */
  const handleLogout = async () => {
    try {
      await fetch("/api/users/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    setUserEmail("");
    setConnectionEmail("");
    setNotificationCount(0);
    setPage("home");
  };

  const goHome = () => {
    setPage("dashboard");
  };

  const goMatches = () => {
    setPage("matches");
  };

  const goRequests = () => {
    setPage("requests");
  };

  const goSentRequests = () => {
    setPage("sentRequests");
  };

  const goConnections = () => {
    setPage("connections");
  };

  const goProfile = () => {
    setPage("profile");
  };

  const goNotifications = () => {
    setPage("notifications");
  };

  const handleOpenChat = (email) => {
    setConnectionEmail(email);
    setPage("chat");
  };

  const renderNavigation = () => {
    return (
      <Navigation
        onHome={goHome}
        onMatches={goMatches}
        onRequests={goRequests}
        onSentRequests={goSentRequests}
        onConnections={goConnections}
        onProfile={goProfile}
        onNotifications={goNotifications}
        notificationCount={notificationCount}
        onLogout={handleLogout}
      />
    );
  };

  /*
   * While checking the backend session,
   * don't show the wrong page for a moment.
   */
  if (checkingSession) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            SkillSwap
          </div>

          <h2>Checking session...</h2>

          <p className="auth-subtitle">
            Please wait.
          </p>
        </div>
      </div>
    );
  }

  if (page === "register") {
    return <Register />;
  }

  if (page === "login") {
    return <Login onLogin={handleLogin} />;
  }

  if (page === "dashboard") {
    return (
      <div>
        {renderNavigation()}

        <Dashboard
          email={userEmail}
          onFindMatches={goMatches}
          onViewRequests={goRequests}
          onViewSentRequests={goSentRequests}
          onViewConnections={goConnections}
          onLogout={handleLogout}
        />
      </div>
    );
  }

  if (page === "matches") {
    return (
      <div>
        {renderNavigation()}

        <Matches email={userEmail} />
      </div>
    );
  }

  if (page === "requests") {
    return (
      <div>
        {renderNavigation()}

        <Requests email={userEmail} />
      </div>
    );
  }

  if (page === "sentRequests") {
    return (
      <div>
        {renderNavigation()}

        <SentRequests email={userEmail} />
      </div>
    );
  }

  if (page === "connections") {
    return (
      <div>
        {renderNavigation()}

        <Connections
          email={userEmail}
          onOpenChat={handleOpenChat}
        />
      </div>
    );
  }

  if (page === "profile") {
    return (
      <div>
        {renderNavigation()}

        <Profile email={userEmail} />
      </div>
    );
  }

  if (page === "notifications") {
    return (
      <div>
        {renderNavigation()}

        <Notifications email={userEmail} />
      </div>
    );
  }

  if (page === "chat") {
    return (
      <div>
        {renderNavigation()}

        <Chat
          email={userEmail}
          connectionEmail={connectionEmail}
        />
      </div>
    );
  }

  return (
    <div className="home">
      <div className="hero-content">
        <div className="hero-badge">
          Learn. Teach. Grow.
        </div>

        <h1>SkillSwap</h1>

        <p className="hero-title">
          Exchange knowledge.
          <br />
          Build connections.
        </p>

        <p className="hero-description">
          Share what you know, learn something new,
          and connect with people who complement your skills.
        </p>

        <div className="hero-buttons">
          <button
            className="hero-primary"
            onClick={() => setPage("register")}
          >
            Get Started
          </button>

          <button
            className="hero-secondary"
            onClick={() => setPage("login")}
          >
            Login
          </button>
        </div>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <div className="feature-icon">🔎</div>

          <h2>Find Skills</h2>

          <p>
            Discover people who can teach what
            you want to learn.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔄</div>

          <h2>Swap Knowledge</h2>

          <p>
            Exchange your skills through meaningful
            one-to-one learning.
          </p>
        </div>

        <div className="feature-card">
          <div className="feature-icon">💬</div>

          <h2>Connect</h2>

          <p>
            Chat with your connections and start
            your skill exchange.
          </p>
        </div>
      </div>

      <footer className="home-footer">
        <h3>SkillSwap</h3>

        <p>Learn. Teach. Connect.</p>

        <span>
          © 2026 SkillSwap. All rights reserved.
        </span>
      </footer>
    </div>
  );
}

export default App;