import { useState } from "react";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const handleRegister = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name,
          email: email,
          password: password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.message || "Registration failed.");
        setMessageType("error");
        return;
      }

      setMessage(result.message || "Registration successful! You can now login.");
      setMessageType("success");

      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage("Could not connect to the server.");
      setMessageType("error");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          SkillSwap
        </div>

        <h1>Create Account 🚀</h1>

        <p className="auth-subtitle">
          Join SkillSwap and start exchanging skills.
        </p>

        <form onSubmit={handleRegister} className="auth-form">
          <label>Name</label>

          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />

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
            placeholder="Create a password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          {message && (
            <p
              className="auth-message"
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

          <button className="auth-button" type="submit">
            Create Account
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? Use the Login option from the home page.
        </p>
      </div>
    </div>
  );
}

export default Register;