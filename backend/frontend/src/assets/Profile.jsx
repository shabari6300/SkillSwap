import { useEffect, useState } from "react";

function Profile({ email }) {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("Loading profile...");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(
          `/api/profile?email=${encodeURIComponent(email)}`
        );

        if (!response.ok) {
          setMessage("Could not load profile.");
          return;
        }

        const data = await response.json();

        if (data.message === "User not found") {
          setMessage("User profile not found.");
          return;
        }

        setProfile(data);
        setMessage("");
      } catch (error) {
        setMessage("Could not connect to the server.");
      }
    };

    loadProfile();
  }, [email]);

  if (message) {
    return (
      <div className="page-container">
        <div className="page-message">
          {message}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Your SkillSwap profile and learning information.</p>
      </div>

      <div className="profile-card">
        <div className="profile-top">
          <div className="profile-avatar">
            {profile.name
              ? profile.name.charAt(0).toUpperCase()
              : "U"}
          </div>

          <div>
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>
        </div>

        <div className="profile-skills">
          <div className="profile-skill">
            <span className="profile-label">
              CAN TEACH
            </span>

            <strong>
              {profile.teachSkill || "Not set"}
            </strong>
          </div>

          <div className="profile-skill">
            <span className="profile-label">
              WANTS TO LEARN
            </span>

            <strong>
              {profile.learnSkill || "Not set"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;