import { useEffect, useMemo, useState } from "react";

function Matches({ email }) {
  const [matches, setMatches] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("Finding your matches...");

  const loadData = async () => {
    try {
      const [matchesResponse, requestsResponse] =
        await Promise.all([
          fetch(
            `/api/matches?email=${encodeURIComponent(email)}`
          ),
          fetch(
            `/api/swap-requests/sent?email=${encodeURIComponent(email)}`
          ),
        ]);

      if (!matchesResponse.ok || !requestsResponse.ok) {
        setMessage("Could not load your matches.");
        return;
      }

      const matchesData = await matchesResponse.json();
      const requestsData = await requestsResponse.json();

      setMatches(matchesData);
      setSentRequests(requestsData);

      if (matchesData.length === 0) {
        setMessage("No mutual skill matches found yet.");
      } else {
        setMessage("");
      }
    } catch (error) {
      setMessage("Could not connect to the server.");
    }
  };

  useEffect(() => {
    loadData();
  }, [email]);

  const getRequestStatus = (receiverEmail) => {
    const request = sentRequests.find(
      (item) =>
        item.receiverEmail.toLowerCase() ===
        receiverEmail.toLowerCase()
    );

    return request ? request.status : null;
  };

  const sendSwapRequest = async (receiverEmail) => {
    try {
      const response = await fetch("/api/swap-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requesterEmail: email,
          receiverEmail: receiverEmail,
        }),
      });

      if (!response.ok) {
        setMessage("Could not send the swap request.");
        return;
      }

      await loadData();

      setMessage("Skill swap request sent successfully!");
    } catch (error) {
      setMessage("Could not connect to the server.");
    }
  };

  const filteredMatches = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return matches;
    }

    return matches.filter((user) => {
      return (
        (user.name || "").toLowerCase().includes(query) ||
        (user.email || "").toLowerCase().includes(query) ||
        (user.teachSkill || "").toLowerCase().includes(query) ||
        (user.learnSkill || "").toLowerCase().includes(query)
      );
    });
  }, [matches, search]);

  const renderRequestButton = (user) => {
    const status = getRequestStatus(user.email);

    if (status === "PENDING") {
      return (
        <button className="request-status-button pending-button" disabled>
          ⏳ Request Pending
        </button>
      );
    }

    if (status === "ACCEPTED") {
      return (
        <button className="request-status-button accepted-button" disabled>
          ✅ Already Connected
        </button>
      );
    }

    if (status === "REJECTED") {
      return (
        <button
          className="primary-button"
          onClick={() => sendSwapRequest(user.email)}
        >
          🔄 Send Request Again
        </button>
      );
    }

    return (
      <button
        className="primary-button"
        onClick={() => sendSwapRequest(user.email)}
      >
        🤝 Request Skill Swap
      </button>
    );
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Your Skill Matches</h1>

        <p>
          Discover people whose skills match what you
          want to learn.
        </p>
      </div>

      <div className="match-search">
        <input
          type="text"
          placeholder="Search by name, email, or skill..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {search && (
          <button
            className="clear-search-button"
            onClick={() => setSearch("")}
          >
            Clear
          </button>
        )}
      </div>

      {message && (
        <p className="page-message">
          {message}
        </p>
      )}

      {!message &&
        search &&
        filteredMatches.length === 0 && (
          <div className="no-results">
            <div className="no-results-icon">
              🔍
            </div>

            <h2>No matches found</h2>

            <p>
              Try searching for a different name or skill.
            </p>
          </div>
        )}

      <div className="matches-grid">
        {filteredMatches.map((user) => (
          <div
            className="match-card"
            key={user.id}
          >
            <div className="match-avatar">
              {user.name
                ? user.name.charAt(0).toUpperCase()
                : "U"}
            </div>

            <h2>{user.name}</h2>

            <p className="match-email">
              {user.email}
            </p>

            <div className="skill-box">
              <strong>CAN TEACH</strong>
              <span>{user.teachSkill}</span>
            </div>

            <div className="skill-box">
              <strong>WANTS TO LEARN</strong>
              <span>{user.learnSkill}</span>
            </div>

            {renderRequestButton(user)}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Matches;