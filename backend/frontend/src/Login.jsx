import { useState } from "react";

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setMessage("");

    try {
      const response = await fetch("/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Invalid email or password.");
        return;
      }

      /*
       * Verify that the Spring Security session is active.
       */
      const meResponse = await fetch("/api/users/me", {
        method: "GET",
        credentials: "include",
      });

      const me = await meResponse.json();

      if (!meResponse.ok) {
        setMessage("Login succeeded, but the session could not be verified.");
        return;
      }

      onLogin(me.email);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
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
          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {message && (
            <p className="auth-error">
              {message}
            </p>
          )}

          <button className="auth-button" type="submit">
            Login
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