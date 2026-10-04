import { useEffect, useState } from "react";

function Notifications({ email }) {
  const [activities, setActivities] = useState([]);
  const [message, setMessage] = useState("Loading activity...");

  const loadActivity = async () => {
    try {
      const [receivedResponse, sentResponse] =
        await Promise.all([
          fetch(
            `/api/swap-requests/received?email=${encodeURIComponent(email)}`
          ),
          fetch(
            `/api/swap-requests/sent?email=${encodeURIComponent(email)}`
          ),
        ]);

      if (!receivedResponse.ok || !sentResponse.ok) {
        setMessage("Could not load activity.");
        return;
      }

      const receivedRequests = await receivedResponse.json();
      const sentRequests = await sentResponse.json();

      const activityList = [];

      receivedRequests.forEach((request) => {
        if (request.status === "PENDING") {
          activityList.push({
            id: `received-pending-${request.id}`,
            title: "New swap request",
            text: `${request.requesterEmail} sent you a skill swap request.`,
            type: "pending",
          });
        }

        if (request.status === "ACCEPTED") {
          activityList.push({
            id: `received-accepted-${request.id}`,
            title: "Swap accepted",
            text: `Your swap with ${request.requesterEmail} is accepted.`,
            type: "accepted",
          });
        }

        if (request.status === "REJECTED") {
          activityList.push({
            id: `received-rejected-${request.id}`,
            title: "Swap rejected",
            text: `Your swap with ${request.requesterEmail} was rejected.`,
            type: "rejected",
          });
        }
      });

      sentRequests.forEach((request) => {
        if (request.status === "ACCEPTED") {
          activityList.push({
            id: `sent-accepted-${request.id}`,
            title: "Swap accepted",
            text: `${request.receiverEmail} accepted your skill swap request.`,
            type: "accepted",
          });
        }

        if (request.status === "REJECTED") {
          activityList.push({
            id: `sent-rejected-${request.id}`,
            title: "Swap rejected",
            text: `${request.receiverEmail} rejected your skill swap request.`,
            type: "rejected",
          });
        }

        if (request.status === "PENDING") {
          activityList.push({
            id: `sent-pending-${request.id}`,
            title: "Request pending",
            text: `Your request to ${request.receiverEmail} is still pending.`,
            type: "pending",
          });
        }
      });

      setActivities(activityList);

      if (activityList.length === 0) {
        setMessage("No activity yet.");
      } else {
        setMessage("");
      }
    } catch (error) {
      setMessage("Could not connect to the server.");
    }
  };

  useEffect(() => {
    loadActivity();

    const interval = setInterval(() => {
      loadActivity();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [email]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Activity</h1>

        <p>
          Stay updated on your SkillSwap activity.
        </p>
      </div>

      {message && (
        <div className="page-message">
          {message}
        </div>
      )}

      {!message && (
        <div className="activity-list">
          {activities.map((activity) => (
            <div
              className={`activity-card ${activity.type}`}
              key={activity.id}
            >
              <div className="activity-content">
                <h2>{activity.title}</h2>

                <p>{activity.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Notifications;