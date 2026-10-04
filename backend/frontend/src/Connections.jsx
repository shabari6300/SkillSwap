import { useEffect, useState } from "react";

function Connections({ email, onOpenChat }) {
  const [connections, setConnections] = useState([]);
  const [message, setMessage] = useState("Loading connections...");

  useEffect(() => {
    const loadConnections = async () => {
      try {
        const [sentResponse, receivedResponse] = await Promise.all([
          fetch(
            `/api/swap-requests/sent?email=${encodeURIComponent(email)}`,
            {
              method: "GET",
              credentials: "include",
            }
          ),
          fetch(
            `/api/swap-requests/received?email=${encodeURIComponent(email)}`,
            {
              method: "GET",
              credentials: "include",
            }
          ),
        ]);

        if (!sentResponse.ok || !receivedResponse.ok) {
          setMessage("Could not load connections.");
          return;
        }

        const sentRequests = await sentResponse.json();
        const receivedRequests = await receivedResponse.json();

        const sentConnections = sentRequests
          .filter((request) => request.status === "ACCEPTED")
          .map((request) => ({
            email: request.receiverEmail,
          }));

        const receivedConnections = receivedRequests
          .filter((request) => request.status === "ACCEPTED")
          .map((request) => ({
            email: request.requesterEmail,
          }));

        const allConnections = [
          ...sentConnections,
          ...receivedConnections,
        ];

        const uniqueConnections = Array.from(
          new Map(
            allConnections.map((connection) => [
              connection.email,
              connection,
            ])
          ).values()
        );

        setConnections(uniqueConnections);

        if (uniqueConnections.length === 0) {
          setMessage("No accepted skill swaps yet.");
        } else {
          setMessage("");
        }
      } catch (error) {
        console.error(error);
        setMessage("Could not connect to the server.");
      }
    };

    if (email) {
      loadConnections();
    }
  }, [email]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>My Connections</h1>

        <p>
          People you've successfully matched with.
        </p>
      </div>

      {message && (
        <p className="page-message">
          {message}
        </p>
      )}

      <div className="connection-list">
        {connections.map((connection) => (
          <div
            className="connection-card"
            key={connection.email}
          >
            <div className="connection-avatar">
              {connection.email
                .charAt(0)
                .toUpperCase()}
            </div>

            <div className="connection-info">
              <h2>{connection.email}</h2>

              <p>Skill swap accepted</p>
            </div>

            <button
              className="chat-button"
              onClick={() =>
                onOpenChat(connection.email)
              }
            >
              Chat
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Connections;