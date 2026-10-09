
import { useState } from "react";

function Login({ onLogin, onForgotPassword }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Invalid email or password.");
        return;
      }

      // Verify that the Spring Security session is active.
      const meResponse = await fetch("/api/users/me", {
        method: "GET",
        credentials: "include",
      });

      const me = await meResponse.json();

      if (!meResponse.ok) {
        setMessage(
          "Login succeeded, but the session could not be verified."
        );
        return;
      }

      onLogin(me.email);
    } catch (error) {
      console.error("Login failed:", error);
      setMessage("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          SkillSwap
        </div>

        <h1>Welcome Back</h1>

        <p className="auth-subtitle">
          Login to continue your skill exchange journey.
        </p>

        <form onSubmit={handleLogin} className="auth-form">
          <label htmlFor="login-email">Email</label>

          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label htmlFor="login-password">Password</label>

          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <div style={{ textAlign: "right", marginTop: "-4px" }}>
            <button
              type="button"
              onClick={onForgotPassword}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "inherit",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "0.9rem",
              }}
            >
              Forgot password?
            </button>
          </div>

          {message && (
            <p className="auth-error" role="alert">
              {message}
            </p>
          )}

          <button
            className="auth-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-footer">
          New to SkillSwap? Click <strong>Get Started</strong> from the home page.
        </p>
      </div>
    </div>
  );
}

export default Login;
