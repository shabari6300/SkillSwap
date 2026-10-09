
import { useState } from "react";

function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/users/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(
          result.message || "Unable to request a password reset. Please try again."
        );
        return;
      }

      setMessage(
        result.message ||
          "If an account with that email exists, a reset link has been sent."
      );
    } catch (error) {
      console.error("Password reset request failed:", error);
      setMessage("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">SkillSwap</div>

        <h1>Forgot Password?</h1>

        <p className="auth-subtitle">
          Enter your registered email address and we'll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label htmlFor="reset-email">Email</label>

          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="Enter your registered email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {message && (
            <p role="status" aria-live="polite" className="auth-error">
              {message}
            </p>
          )}

          <button
            className="auth-button"
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <p className="auth-footer">
          <button
            type="button"
            onClick={onBackToLogin}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Back to Login
          </button>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
