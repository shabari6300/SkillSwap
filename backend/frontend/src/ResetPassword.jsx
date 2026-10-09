
import { useState } from "react";

function ResetPassword({ onBackToLogin }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const token =
    new URLSearchParams(window.location.search).get("resetToken") || "";

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!token) {
      setMessage("This password reset link is invalid.");
      return;
    }

    if (newPassword.length < 8) {
      setMessage("Your password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("The passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Unable to reset your password.");
        return;
      }

      setSuccess(true);
      setMessage(
        result.message ||
          "Your password has been reset. You can now log in."
      );
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error("Password reset failed:", error);
      setMessage("Could not connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">SkillSwap</div>

        <h1>Reset Password</h1>

        <p className="auth-subtitle">
          Choose a new password for your SkillSwap account.
        </p>

        {!success && (
          <form onSubmit={handleSubmit} className="auth-form">
            <label htmlFor="new-password">New Password</label>

            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              required
            />

            <label htmlFor="confirm-password">Confirm Password</label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Enter the password again"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
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
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}

        {success && (
          <>
            <p role="status" aria-live="polite">
              {message}
            </p>

            <button
              className="auth-button"
              type="button"
              onClick={onBackToLogin}
            >
              Go to Login
            </button>
          </>
        )}

        {!success && (
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
        )}
      </div>
    </div>
  );
}

export default ResetPassword;
