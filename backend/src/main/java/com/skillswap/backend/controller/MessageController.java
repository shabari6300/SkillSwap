package com.skillswap.backend.controller;

import com.skillswap.backend.entity.Message;
import com.skillswap.backend.repository.MessageRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageRepository messageRepository;

    public MessageController(
            MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    @PostMapping
    public ResponseEntity<?> sendMessage(
            @RequestBody Message message,
            Authentication authentication) {

        String authenticatedEmail =
                authentication.getName();

        /*
         * Never trust the sender email supplied
         * by the frontend.
         */
        message.setSenderEmail(authenticatedEmail);

        /*
         * Receiver must be provided.
         */
        if (message.getReceiverEmail() == null ||
                message.getReceiverEmail().isBlank()) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            "Receiver email is required"
                    ));
        }

        /*
         * Prevent sending a message to yourself.
         */
        if (authenticatedEmail.equalsIgnoreCase(
                message.getReceiverEmail())) {

            return ResponseEntity
                    .badRequest()
                    .body(Map.of(
                            "message",
                            "You cannot send a message to yourself"
                    ));
        }

        Message savedMessage =
                messageRepository.save(message);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedMessage);
    }

    @GetMapping
    public ResponseEntity<?> getMessages(
            @RequestParam String user1,
            @RequestParam String user2,
            Authentication authentication) {

        String authenticatedEmail =
                authentication.getName();

        /*
         * The logged-in user must be one of the
         * two people in the conversation.
         *
         * We do NOT trust user1 to identify the
         * authenticated user.
         */
        boolean userIsPartOfConversation =
                authenticatedEmail.equalsIgnoreCase(user1)
                ||
                authenticatedEmail.equalsIgnoreCase(user2);

        if (!userIsPartOfConversation) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You are not part of this conversation"
                    ));
        }

        /*
         * Use the authenticated user's email as
         * the first side of the conversation.
         */
        String otherUser =
                authenticatedEmail.equalsIgnoreCase(user1)
                        ? user2
                        : user1;

        List<Message> messages =
                messageRepository
                        .findBySenderEmailAndReceiverEmailOrReceiverEmailAndSenderEmail(
                                authenticatedEmail,
                                otherUser,
                                authenticatedEmail,
                                otherUser
                        );

        return ResponseEntity.ok(messages);
    }
}