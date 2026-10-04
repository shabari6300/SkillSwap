import { useEffect, useState } from "react";

function Requests({ email }) {
  const [requests, setRequests] = useState([]);
  const [message, setMessage] = useState("Loading requests...");

  const loadRequests = async () => {
    try {
      const response = await fetch(
        `/api/swap-requests/received?email=${encodeURIComponent(email)}`
      );

      if (!response.ok) {
        setMessage("Could not load requests.");
        return;
      }

      const data = await response.json();

      setRequests(data);

      if (data.length === 0) {
        setMessage("No swap requests yet.");
      } else {
        setMessage("");
      }
    } catch (error) {
      setMessage("Could not connect to the server.");
    }
  };

  useEffect(() => {
    loadRequests();
  }, [email]);

  const updateRequest = async (id, action) => {
    try {
      const response = await fetch(
        `/api/swap-requests/${id}/${action}`,
        {
          method: "PUT",
        }
      );

      const result = await response.text();

      if (response.ok) {
        setMessage(result);
        loadRequests();
      } else {
        setMessage("Could not update the request.");
      }
    } catch (error) {
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Swap Requests</h1>
        <p>Manage the skill swap requests you've received.</p>
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
              {request.requesterEmail.charAt(0).toUpperCase()}
            </div>

            <div className="request-content">
              <h2>{request.requesterEmail}</h2>

              <div className={`status-badge ${request.status.toLowerCase()}`}>
                {request.status}
              </div>

              {request.status === "PENDING" && (
                <div className="request-actions">
                  <button
                    className="accept-button"
                    onClick={() =>
                      updateRequest(request.id, "accept")
                    }
                  >
                    Accept
                  </button>

                  <button
                    className="reject-button"
                    onClick={() =>
                      updateRequest(request.id, "reject")
                    }
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Requests;