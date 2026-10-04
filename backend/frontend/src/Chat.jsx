import { useEffect, useState } from "react";

function Chat({ email, connectionEmail }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  const loadMessages = async () => {
    try {
      const response = await fetch(
        `/api/messages?user1=${encodeURIComponent(
          email
        )}&user2=${encodeURIComponent(connectionEmail)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        setMessage("Could not load messages.");
        return;
      }

      const data = await response.json();

      setMessages(data);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  useEffect(() => {
    if (!email || !connectionEmail) {
      return;
    }

    loadMessages();

    const interval = setInterval(() => {
      loadMessages();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [email, connectionEmail]);

  const sendMessage = async (event) => {
    event.preventDefault();

    const trimmedContent = content.trim();

    if (!trimmedContent) {
      return;
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          receiverEmail: connectionEmail,
          content: trimmedContent,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Message could not be sent.";

        try {
          const errorData = await response.json();

          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (error) {
          // Keep the default error message.
        }

        setMessage(errorMessage);
        return;
      }

      setContent("");
      setMessage("");

      await loadMessages();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-avatar">
          {connectionEmail.charAt(0).toUpperCase()}
        </div>

        <div>
          <h1>Chat</h1>
          <p>{connectionEmail}</p>
        </div>
      </div>

      {message && (
        <p className="page-message">
          {message}
        </p>
      )}

      <div className="chat-box">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <p>No messages yet.</p>

            <span>
              Start your skill exchange conversation!
            </span>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={
                msg.senderEmail === email
                  ? "message-row sent"
                  : "message-row received"
              }
            >
              <div
                className={
                  msg.senderEmail === email
                    ? "message-bubble sent-bubble"
                    : "message-bubble received-bubble"
                }
              >
                <span className="message-sender">
                  {msg.senderEmail === email
                    ? "You"
                    : msg.senderEmail}
                </span>

                <p>{msg.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form
        className="chat-form"
        onSubmit={sendMessage}
      >
        <input
          type="text"
          placeholder="Type your message..."
          value={content}
          onChange={(event) =>
            setContent(event.target.value)
          }
        />

        <button type="submit">
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat;