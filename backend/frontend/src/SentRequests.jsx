import { useEffect, useState } from "react";

function SentRequests({ email }) {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState("Loading sent requests...");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const response = await fetch(
          `/api/swap-requests/sent?email=${encodeURIComponent(email)}`
        );

        if (!response.ok) {
          setMessage("Could not load sent requests.");
          return;
        }

        const data = await response.json();

        setRequests(data);

        if (data.length === 0) {
          setMessage("You have not sent any swap requests yet.");
        } else {
          setMessage("");
        }
      } catch (error) {
        setMessage("Could not connect to the server.");
      }
    };

    loadRequests();
  }, [email]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Sent Swap Requests</h1>
        <p>Track the skill swap requests you've sent.</p>
      </div>

      {message && (
        <p className="page-message">
          {message}
        </p>
      )}

      <div className="request-list">
        {requests.map((request) => (
          <div className="request-card" key={request.id}>
            <div className="request-avatar">
              {request.receiverEmail.charAt(0).toUpperCase()}
            </div>

            <div className="request-content">
              <h2>{request.receiverEmail}</h2>

              <div className={`status-badge ${request.status.toLowerCase()}`}>
                {request.status}
              </div>

              {request.status === "ACCEPTED" && (
                <p className="accepted-message">
                  Swap accepted! You can now connect with this user.
                </p>
              )}

              {request.status === "REJECTED" && (
                <p className="rejected-message">
                  This swap request was rejected.
                </p>
              )}

              {request.status === "PENDING" && (
                <p className="pending-message">
                  Waiting for the other user to respond.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SentRequests;