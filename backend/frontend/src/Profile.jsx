import { useEffect, useState } from "react";

function Profile({ email }) {
  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("Loading profile...");
  const [editing, setEditing] = useState(false);

  const [bio, setBio] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [teachDescription, setTeachDescription] = useState("");
  const [learnDescription, setLearnDescription] = useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(
          `/api/profile`,
          {
            method: "GET",
            credentials: "include",
          }
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

        setBio(data.bio || "");
        setExperienceLevel(data.experienceLevel || "");
        setTeachDescription(data.teachDescription || "");
        setLearnDescription(data.learnDescription || "");

        setMessage("");
      } catch (error) {
        console.error("Profile loading error:", error);
        setMessage("Could not connect to the server.");
      }
    };

    loadProfile();
  }, [email]);

  const saveProfile = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          bio,
          experienceLevel,
          teachDescription,
          learnDescription,
        }),
      });

      if (!response.ok) {
        setMessage("Could not save profile.");
        return;
      }

      const updatedProfile = await response.json();

      setProfile((current) => ({
        ...current,
        bio: updatedProfile.bio ?? bio,
        experienceLevel:
          updatedProfile.experienceLevel ?? experienceLevel,
        teachDescription:
          updatedProfile.teachDescription ?? teachDescription,
        learnDescription:
          updatedProfile.learnDescription ?? learnDescription,
      }));

      setEditing(false);
      setMessage("");
    } catch (error) {
      console.error("Profile save error:", error);
      setMessage("Could not connect to the server.");
    }
  };

  if (message && !profile) {
    return (
      <div className="page-container">
        <div className="page-message">{message}</div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="page-container profile-page">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your SkillSwap profile and learning information.</p>
      </div>

      <div className="profile-card">

        <div className="profile-top">
          <div className="profile-avatar">
            {profile.name
              ? profile.name.charAt(0).toUpperCase()
              : "U"}
          </div>

          <div className="profile-identity">
            <h2>{profile.name}</h2>
            <p>{profile.email}</p>
          </div>
        </div>

        <div className="profile-main-skills">

          <div className="profile-highlight teach">
            <span className="profile-highlight-label">
              CAN TEACH
            </span>

            <strong>
              {profile.teachSkill || "Not set"}
            </strong>
          </div>

          <div className="profile-highlight learn">
            <span className="profile-highlight-label">
              WANTS TO LEARN
            </span>

            <strong>
              {profile.learnSkill || "Not set"}
            </strong>
          </div>

        </div>

        <div className="profile-details">

          <div className="profile-detail-card">
            <span className="profile-detail-label">
              BIO
            </span>

            <p>
              {profile.bio || "No bio added yet."}
            </p>
          </div>

          <div className="profile-detail-card">
            <span className="profile-detail-label">
              EXPERIENCE LEVEL
            </span>

            <p>
              {profile.experienceLevel || "Not set"}
            </p>
          </div>

          <div className="profile-detail-card">
            <span className="profile-detail-label">
              WHAT I CAN TEACH
            </span>

            <p>
              {profile.teachDescription || "Not added yet."}
            </p>
          </div>

          <div className="profile-detail-card">
            <span className="profile-detail-label">
              WHAT I WANT TO LEARN
            </span>

            <p>
              {profile.learnDescription || "Not added yet."}
            </p>
          </div>

        </div>

        {!editing && (
          <button
            className="profile-edit-button"
            onClick={() => setEditing(true)}
          >
            Edit Profile
          </button>
        )}

        {editing && (
          <div className="profile-edit-section">

            <h2 className="profile-edit-title">
              Edit Your Profile
            </h2>

            <form
              className="profile-form"
              onSubmit={saveProfile}
            >

              <label>Bio</label>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell people a little about yourself"
              />

              <label>Experience Level</label>
              <input
                type="text"
                value={experienceLevel}
                onChange={(e) =>
                  setExperienceLevel(e.target.value)
                }
                placeholder="Beginner, Intermediate, Advanced"
              />

              <label>What I Can Teach</label>
              <input
                type="text"
                value={teachDescription}
                onChange={(e) =>
                  setTeachDescription(e.target.value)
                }
                placeholder="What can you teach?"
              />

              <label>What I Want To Learn</label>
              <input
                type="text"
                value={learnDescription}
                onChange={(e) =>
                  setLearnDescription(e.target.value)
                }
                placeholder="What do you want to learn?"
              />

              <div className="profile-form-actions">
                <button
                  type="submit"
                  className="profile-save-button"
                >
                  Save Changes
                </button>

                <button
                  type="button"
                  className="profile-cancel-button"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>

            </form>

          </div>
        )}

      </div>
    </div>
  );
}

export default Profile;