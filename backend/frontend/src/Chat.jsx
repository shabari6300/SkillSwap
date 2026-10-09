
import { useEffect, useRef, useState } from "react";

function Chat({ email, connectionEmail }) {
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");

  const [socketReady, setSocketReady] = useState(false);
  const [callStatus, setCallStatus] = useState("idle");
  const [callType, setCallType] = useState("voice");
  const [incomingCall, setIncomingCall] = useState(null);
  const [callNotice, setCallNotice] = useState("");
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const wsRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const currentCallRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const signalHandlerRef = useRef(null);
  const cleanupCallRef = useRef(null);

  const normalizeEmail = (value) =>
    String(value || "").trim().toLowerCase();

  // ---------------- CHAT MESSAGES ----------------

  const loadMessages = async () => {
    if (!email || !connectionEmail) {
      return;
    }

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
      console.error("Message loading failed:", error);
      setMessage("Could not connect to the server.");
    }
  };

  useEffect(() => {
    if (!email || !connectionEmail) {
      return;
    }

    loadMessages();

    const interval = setInterval(loadMessages, 2000);

    return () => clearInterval(interval);
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
        } catch {
          // Keep the default error message.
        }

        setMessage(errorMessage);
        return;
      }

      setContent("");
      setMessage("");

      await loadMessages();
    } catch (error) {
      console.error("Message sending failed:", error);
      setMessage("Could not connect to the server.");
    }
  };

  // ---------------- CALL CLEANUP ----------------

  const cleanupCall = (notice = "") => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.ontrack = null;
      peerConnectionRef.current.onconnectionstatechange = null;

      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      localStreamRef.current = null;
    }

    remoteStreamRef.current = null;
    currentCallRef.current = null;
    pendingIceCandidatesRef.current = [];

    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setCallStatus("idle");
    setMicMuted(false);
    setCameraOff(false);
    setCallNotice(notice);
  };

  cleanupCallRef.current = cleanupCall;

  // ---------------- SIGNALING ----------------

  const sendSignal = (type, to, callId, payload = {}) => {
    const socket = wsRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    socket.send(
      JSON.stringify({
        type,
        to,
        callId,
        payload,
      })
    );

    return true;
  };

  const flushPendingIceCandidates = async () => {
    const peerConnection = peerConnectionRef.current;

    if (!peerConnection || !peerConnection.remoteDescription) {
      return;
    }

    while (pendingIceCandidatesRef.current.length > 0) {
      const candidate = pendingIceCandidatesRef.current.shift();

      try {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(candidate)
        );
      } catch (error) {
        console.error("Could not add ICE candidate:", error);
      }
    }
  };

  const createPeerConnection = (peerEmail, callId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302",
        },
      ],
    });

    peerConnectionRef.current = peerConnection;

    const incomingStream = new MediaStream();

    remoteStreamRef.current = incomingStream;
    setRemoteStream(incomingStream);

    const stream = localStreamRef.current;

    if (stream) {
      stream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, stream);
      });
    }

    peerConnection.ontrack = (event) => {
      const receivedStream = event.streams?.[0];

      if (receivedStream) {
        remoteStreamRef.current = receivedStream;
        setRemoteStream(receivedStream);
        return;
      }

      const targetStream =
        remoteStreamRef.current || new MediaStream();

      if (
        !targetStream
          .getTracks()
          .some((track) => track.id === event.track.id)
      ) {
        targetStream.addTrack(event.track);
      }

      remoteStreamRef.current = targetStream;
      setRemoteStream(targetStream);
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate =
          typeof event.candidate.toJSON === "function"
            ? event.candidate.toJSON()
            : event.candidate;

        sendSignal(
          "ice-candidate",
          peerEmail,
          callId,
          { candidate }
        );
      }
    };

    peerConnection.onconnectionstatechange = () => {
      if (peerConnection.connectionState === "connected") {
        setCallStatus("active");
        setCallNotice("");
      }

      if (peerConnection.connectionState === "failed") {
        cleanupCallRef.current?.(
          "The call connection failed. Please try again."
        );
      }
    };

    return peerConnection;
  };

  // ---------------- PROCESS SIGNALS ----------------

  const handleSignal = async (signal) => {
    if (signal.type === "error") {
      setCallNotice(
        signal.message || "Call signaling failed."
      );
      return;
    }

    if (signal.type === "peer-unavailable") {
      const activeCall = currentCallRef.current;

      if (
        activeCall &&
        activeCall.callId === signal.callId
      ) {
        cleanupCallRef.current?.(
          "The other user is not currently connected to this chat."
        );
      }

      return;
    }

    // Only show calls from the person in this open conversation.
    if (signal.type === "call") {
      if (
        normalizeEmail(signal.from) !==
        normalizeEmail(connectionEmail)
      ) {
        sendSignal(
          "reject",
          signal.from,
          signal.callId,
          { reason: "Open the corresponding SkillSwap chat first." }
        );

        return;
      }

      if (currentCallRef.current) {
        sendSignal("busy", signal.from, signal.callId);
        return;
      }

      const mode =
        signal.payload?.mode === "video"
          ? "video"
          : "voice";

      currentCallRef.current = {
        callId: signal.callId,
        peerEmail: signal.from,
        mode,
        role: "callee",
      };

      setCallType(mode);
      setIncomingCall({
        from: signal.from,
        callId: signal.callId,
        mode,
      });

      setCallStatus("incoming");
      setCallNotice("");

      return;
    }

    const activeCall = currentCallRef.current;

    if (
      !activeCall ||
      activeCall.callId !== signal.callId
    ) {
      return;
    }

    if (
      signal.from &&
      normalizeEmail(signal.from) !==
        normalizeEmail(activeCall.peerEmail)
    ) {
      return;
    }

    const peerConnection = peerConnectionRef.current;

    try {
      switch (signal.type) {
        case "accept": {
          if (
            activeCall.role !== "caller" ||
            !peerConnection
          ) {
            return;
          }

          setCallStatus("connecting");
          setCallNotice("Preparing the connection...");

          const offer =
            await peerConnection.createOffer();

          await peerConnection.setLocalDescription(offer);

          sendSignal(
            "offer",
            activeCall.peerEmail,
            activeCall.callId,
            {
              description: {
                type: peerConnection.localDescription.type,
                sdp: peerConnection.localDescription.sdp,
              },
            }
          );

          break;
        }

        case "offer": {
          if (
            activeCall.role !== "callee" ||
            !peerConnection
          ) {
            return;
          }

          const description =
            signal.payload?.description;

          if (!description) {
            setCallNotice("The incoming call offer is invalid.");
            return;
          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(description)
          );

          await flushPendingIceCandidates();

          const answer =
            await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(answer);

          sendSignal(
            "answer",
            activeCall.peerEmail,
            activeCall.callId,
            {
              description: {
                type: peerConnection.localDescription.type,
                sdp: peerConnection.localDescription.sdp,
              },
            }
          );

          setCallNotice("Connecting audio/video...");

          break;
        }

        case "answer": {
          if (
            activeCall.role !== "caller" ||
            !peerConnection
          ) {
            return;
          }

          const description =
            signal.payload?.description;

          if (!description) {
            setCallNotice("The call answer is invalid.");
            return;
          }

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(description)
          );

          await flushPendingIceCandidates();

          setCallNotice("Connecting audio/video...");

          break;
        }

        case "ice-candidate": {
          const candidate = signal.payload?.candidate;

          if (!candidate) {
            return;
          }

          if (
            peerConnection &&
            peerConnection.remoteDescription
          ) {
            await peerConnection.addIceCandidate(
              new RTCIceCandidate(candidate)
            );
          } else {
            pendingIceCandidatesRef.current.push(candidate);
          }

          break;
        }

        case "reject":
          cleanupCallRef.current?.(
            "The other user declined the call."
          );
          break;

        case "busy":
          cleanupCallRef.current?.(
            "The other user is busy on another call."
          );
          break;

        case "end":
          cleanupCallRef.current?.(
            "The other user ended the call."
          );
          break;

        default:
          break;
      }
    } catch (error) {
      console.error("Call negotiation failed:", error);

      cleanupCallRef.current?.(
        "Could not establish the call. Please try again."
      );
    }
  };

  signalHandlerRef.current = handleSignal;

  // ---------------- CONNECT WEBSOCKET ----------------

  useEffect(() => {
    if (!email || !connectionEmail) {
      return;
    }

    let disposed = false;

    const protocol =
      window.location.protocol === "https:"
        ? "wss:"
        : "ws:";

    const socket = new WebSocket(
      `${protocol}//${window.location.host}/ws/calls`
    );

    wsRef.current = socket;

    socket.onopen = () => {
      if (!disposed) {
        setSocketReady(true);
        setCallNotice("");
      }
    };

    socket.onmessage = (event) => {
      try {
        const signal = JSON.parse(event.data);

        Promise.resolve(
          signalHandlerRef.current?.(signal)
        ).catch((error) => {
          console.error("Call signal processing failed:", error);

          setCallNotice(
            "An error occurred while processing the call."
          );
        });
      } catch (error) {
        console.error("Invalid call signal:", error);
      }
    };

    socket.onerror = () => {
      if (!disposed) {
        setCallNotice(
          "Call service is unavailable. Please refresh and try again."
        );
      }
    };

    socket.onclose = () => {
      if (!disposed) {
        setSocketReady(false);

        if (currentCallRef.current) {
          cleanupCallRef.current?.(
            "Call signaling disconnected."
          );
        }
      }
    };

    return () => {
      disposed = true;
      setSocketReady(false);

      if (wsRef.current === socket) {
        wsRef.current = null;
      }

      if (socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }

      cleanupCallRef.current?.("");
    };
  }, [email, connectionEmail]);

  // Attach media streams to the appropriate browser elements.
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject =
        callType === "video" ? localStream : null;

      if (localStream) {
        localVideoRef.current.play().catch(() => {});
      }
    }

    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject =
        callType === "video" ? remoteStream : null;

      if (remoteStream) {
        remoteVideoRef.current.play().catch(() => {});
      }
    }

    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject =
        callType === "voice" ? remoteStream : null;

      if (remoteStream) {
        remoteAudioRef.current.play().catch(() => {});
      }
    }
  }, [localStream, remoteStream, callType, callStatus]);

  // ---------------- START AND ANSWER CALLS ----------------

  const startCall = async (mode) => {
    if (!socketReady) {
      setCallNotice(
        "Call service is connecting. Please wait a moment."
      );
      return;
    }

    if (currentCallRef.current) {
      setCallNotice("A call is already in progress.");
      return;
    }

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCallNotice(
        "Your browser does not support microphone/camera access here. Use HTTPS or localhost."
      );
      return;
    }

    const callId =
      window.crypto?.randomUUID?.() ||
      `${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2)}`;

    currentCallRef.current = {
      callId,
      peerEmail: connectionEmail,
      mode,
      role: "caller",
    };

    setCallType(mode);
    setCallStatus("outgoing");
    setCallNotice("");
    setIncomingCall(null);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: mode === "video",
        });

      if (
        !currentCallRef.current ||
        currentCallRef.current.callId !== callId
      ) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);

      createPeerConnection(connectionEmail, callId);

      const sent = sendSignal(
        "call",
        connectionEmail,
        callId,
        { mode }
      );

      if (!sent) {
        cleanupCall(
          "Call service disconnected. Please try again."
        );
        return;
      }

      setCallNotice(
        "Waiting for the other user to answer..."
      );
    } catch (error) {
      console.error("Could not access local media:", error);

      cleanupCall(
        "Microphone/camera permission was denied or the device is unavailable."
      );
    }
  };

  const answerIncomingCall = async () => {
    const activeCall = currentCallRef.current;

    if (
      !activeCall ||
      activeCall.role !== "callee" ||
      !incomingCall
    ) {
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: activeCall.mode === "video",
        });

      if (
        !currentCallRef.current ||
        currentCallRef.current.callId !== activeCall.callId
      ) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallType(activeCall.mode);

      createPeerConnection(
        activeCall.peerEmail,
        activeCall.callId
      );

      setCallStatus("connecting");
      setCallNotice("Waiting for connection...");

      const sent = sendSignal(
        "accept",
        activeCall.peerEmail,
        activeCall.callId
      );

      if (!sent) {
        cleanupCall(
          "Call service disconnected. Please try again."
        );
      }
    } catch (error) {
      console.error("Could not answer call:", error);

      sendSignal(
        "reject",
        activeCall.peerEmail,
        activeCall.callId,
        { reason: "Media permissions unavailable" }
      );

      cleanupCall(
        "Could not access microphone/camera. Check your browser permissions."
      );
    }
  };

  const rejectIncomingCall = () => {
    const activeCall = currentCallRef.current;

    if (activeCall) {
      sendSignal(
        "reject",
        activeCall.peerEmail,
        activeCall.callId
      );
    }

    cleanupCall("You declined the call.");
  };

  const hangUp = () => {
    const activeCall = currentCallRef.current;

    if (activeCall) {
      sendSignal(
        "end",
        activeCall.peerEmail,
        activeCall.callId
      );
    }

    cleanupCall("Call ended.");
  };

  const toggleMicrophone = () => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const nextMuted = !micMuted;

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !nextMuted;
    });

    setMicMuted(nextMuted);
  };

  const toggleCamera = () => {
    const stream = localStreamRef.current;

    if (!stream) {
      return;
    }

    const nextCameraOff = !cameraOff;

    stream.getVideoTracks().forEach((track) => {
      track.enabled = !nextCameraOff;
    });

    setCameraOff(nextCameraOff);
  };

  const inCall =
    callStatus === "connecting" ||
    callStatus === "active";

  // ---------------- INTERFACE ----------------

  return (
    <div className="chat-page">
      <div className="chat-header">
        <div className="chat-avatar">
          {connectionEmail.charAt(0).toUpperCase()}
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <h1>Chat</h1>
          <p>{connectionEmail}</p>

          <small
            style={{
              color: socketReady ? "#16803d" : "#a16207",
            }}
          >
            {socketReady
              ? "Call service ready"
              : "Connecting call service..."}
          </small>
        </div>

        <div
          className="chat-call-actions"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <button
            type="button"
            className="chat-button"
            disabled={!socketReady || callStatus !== "idle"}
            onClick={() => startCall("voice")}
          >
            📞 Voice Call
          </button>

          <button
            type="button"
            className="chat-button"
            disabled={!socketReady || callStatus !== "idle"}
            onClick={() => startCall("video")}
          >
            🎥 Video Call
          </button>
        </div>
      </div>

      {message && (
        <p className="page-message">
          {message}
        </p>
      )}

      {callNotice && (
        <p
          className="page-message"
          role="status"
          aria-live="polite"
        >
          {callNotice}
        </p>
      )}

      {callStatus === "incoming" && incomingCall && (
        <div
          className="call-panel"
          style={{
            padding: "20px",
            margin: "16px 0",
            borderRadius: "12px",
            background: "var(--card-background, #f3f4f6)",
          }}
        >
          <h2>
            Incoming {incomingCall.mode} call
          </h2>

          <p>
            {incomingCall.from} is calling you.
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "12px",
            }}
          >
            <button
              type="button"
              className="chat-button"
              onClick={answerIncomingCall}
            >
              Accept
            </button>

            <button
              type="button"
              className="chat-button"
              onClick={rejectIncomingCall}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {(callStatus === "outgoing" || inCall) && (
        <div
          className="call-panel"
          style={{
            padding: "16px",
            margin: "16px 0",
            borderRadius: "12px",
            border: "1px solid #d1d5db",
          }}
        >
          <h2>
            {callStatus === "outgoing" &&
              `Calling ${connectionEmail}...`}

            {callStatus === "connecting" &&
              "Connecting call..."}

            {callStatus === "active" &&
              (callType === "video"
                ? "Video call in progress"
                : "Voice call in progress")}
          </h2>

          {callType === "video" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
                margin: "16px 0",
              }}
            >
              <div>
                <p>Other user</p>

                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: "100%",
                    minHeight: "180px",
                    background: "#111827",
                    borderRadius: "10px",
                  }}
                />
              </div>

              <div>
                <p>You</p>

                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  style={{
                    width: "100%",
                    minHeight: "180px",
                    background: "#111827",
                    borderRadius: "10px",
                  }}
                />
              </div>
            </div>
          )}

          {callType === "voice" && (
            <audio
              ref={remoteAudioRef}
              autoPlay
              style={{ display: "none" }}
            />
          )}

          {inCall && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                marginTop: "12px",
              }}
            >
              <button
                type="button"
                className="chat-button"
                onClick={toggleMicrophone}
              >
                {micMuted ? "Unmute Microphone" : "Mute Microphone"}
              </button>

              {callType === "video" && (
                <button
                  type="button"
                  className="chat-button"
                  onClick={toggleCamera}
                >
                  {cameraOff ? "Turn Camera On" : "Turn Camera Off"}
                </button>
              )}

              <button
                type="button"
                className="chat-button"
                onClick={hangUp}
              >
                🔴 End Call
              </button>
            </div>
          )}

          {callStatus === "outgoing" && (
            <button
              type="button"
              className="chat-button"
              onClick={hangUp}
            >
              Cancel Call
            </button>
          )}
        </div>
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
