import { useState } from "react";

function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (event) => {
    event.preventDefault();

    setMessage("");

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

      const result = await response.text();

      if (!response.ok) {
        setMessage(result || "Registration failed.");
        return;
      }

      setMessage("Registration successful! You can now login.");

      setName("");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage("Could not connect to the server.");
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
            <p className="auth-success">
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