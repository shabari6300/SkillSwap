
package com.skillswap.backend.calls;

import com.skillswap.backend.repository.SwapRequestRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.node.ObjectNode;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.security.Principal;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

@Component
public class CallSignalingHandler extends TextWebSocketHandler {

    private static final int MAX_MESSAGE_SIZE = 32 * 1024;

    private static final Set<String> ALLOWED_TYPES = Set.of(
            "call",
            "accept",
            "offer",
            "answer",
            "ice-candidate",
            "reject",
            "end",
            "busy"
    );

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SwapRequestRepository swapRequestRepository;

    private final ConcurrentMap<String, Set<WebSocketSession>>
            sessionsByEmail = new ConcurrentHashMap<>();

    public CallSignalingHandler(
            SwapRequestRepository swapRequestRepository
    ) {
        this.swapRequestRepository = swapRequestRepository;
    }

    @Override
    public void afterConnectionEstablished(
            WebSocketSession session
    ) throws Exception {

        Principal principal = session.getPrincipal();

        if (principal == null
                || principal.getName() == null
                || principal.getName().isBlank()) {

            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        String emailKey = normalizeEmail(principal.getName());

        WebSocketSession safeSession =
                new ConcurrentWebSocketSessionDecorator(
                        session,
                        10_000,
                        512 * 1024
                );

        sessionsByEmail
                .computeIfAbsent(
                        emailKey,
                        key -> ConcurrentHashMap.newKeySet()
                )
                .add(safeSession);
    }

    @Override
    protected void handleTextMessage(
            WebSocketSession session,
            TextMessage textMessage
    ) throws Exception {

        if (textMessage.getPayloadLength() > MAX_MESSAGE_SIZE) {
            sendError(session, "Message too large");
            return;
        }

        Principal principal = session.getPrincipal();

        if (principal == null || principal.getName() == null) {
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        JsonNode input;

        try {
            input = objectMapper.readTree(textMessage.getPayload());
        } catch (Exception exception) {
            sendError(session, "Invalid JSON message");
            return;
        }

        if (input == null || !input.isObject()) {
            sendError(session, "Invalid message format");
            return;
        }

        String type = input.path("type").asText("");
        String recipient = input.path("to").asText("").trim();
        String callId = input.path("callId").asText("");

        if (!ALLOWED_TYPES.contains(type)) {
            sendError(session, "Unsupported call message");
            return;
        }

        if (recipient.isBlank() || recipient.length() > 320) {
            sendError(session, "A valid recipient is required");
            return;
        }

        if (callId.isBlank() || callId.length() > 100) {
            sendError(session, "A valid call ID is required");
            return;
        }

        String senderEmail = principal.getName();
        String senderKey = normalizeEmail(senderEmail);
        String recipientKey = normalizeEmail(recipient);

        if (senderKey.equals(recipientKey)) {
            sendError(session, "You cannot call yourself");
            return;
        }

        /*
         * IMPORTANT:
         * Only users with an accepted SkillSwap relationship
         * may exchange call signaling messages.
         */
        boolean acceptedConnection =
                swapRequestRepository.existsAcceptedConnectionBetween(
                        senderEmail,
                        recipient
                );

        if (!acceptedConnection) {
            sendError(
                    session,
                    "Calls are available only between accepted SkillSwap connections"
            );
            return;
        }

        /*
         * Never trust a sender identity supplied by the browser.
         * The sender is taken from the authenticated session.
         */
        ObjectNode outbound = objectMapper.createObjectNode();

        outbound.put("type", type);
        outbound.put("from", senderEmail);
        outbound.put("callId", callId);

        JsonNode payload = input.get("payload");

        if (payload == null || payload.isNull()) {
            outbound.set(
                    "payload",
                    objectMapper.createObjectNode()
            );
        } else {
            outbound.set("payload", payload.deepCopy());
        }

        Set<WebSocketSession> recipientSessions =
                sessionsByEmail.get(recipientKey);

        if (recipientSessions == null || recipientSessions.isEmpty()) {
            sendPeerUnavailable(session, recipient, callId);
            return;
        }

        boolean delivered = false;

        for (WebSocketSession recipientSession : recipientSessions) {

            if (!recipientSession.isOpen()) {
                continue;
            }

            try {
                sendJson(recipientSession, outbound);
                delivered = true;
            } catch (IOException exception) {
                System.err.println(
                        "Could not deliver call signal to one session."
                );
            }
        }

        if (!delivered) {
            sendPeerUnavailable(session, recipient, callId);
        }
    }

    @Override
    public void afterConnectionClosed(
            WebSocketSession session,
            CloseStatus status
    ) {

        String sessionId = session.getId();

        sessionsByEmail.forEach((email, sessions) -> {

            sessions.removeIf(
                    registeredSession ->
                            registeredSession.getId().equals(sessionId)
            );

            if (sessions.isEmpty()) {
                sessionsByEmail.remove(email, sessions);
            }
        });
    }

    @Override
    public void handleTransportError(
            WebSocketSession session,
            Throwable exception
    ) throws Exception {

        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    private void sendPeerUnavailable(
            WebSocketSession senderSession,
            String recipient,
            String callId
    ) throws IOException {

        ObjectNode response = objectMapper.createObjectNode();

        response.put("type", "peer-unavailable");
        response.put("to", recipient);
        response.put("callId", callId);
        response.put(
                "message",
                "The other user is not currently connected."
        );

        sendJson(senderSession, response);
    }

    private void sendError(
            WebSocketSession session,
            String message
    ) throws IOException {

        ObjectNode response = objectMapper.createObjectNode();

        response.put("type", "error");
        response.put("message", message);

        sendJson(session, response);
    }

    private void sendJson(
            WebSocketSession session,
            JsonNode message
    ) throws IOException {

        if (session.isOpen()) {
            session.sendMessage(
                    new TextMessage(
                            objectMapper.writeValueAsString(message)
                    )
            );
        }
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
