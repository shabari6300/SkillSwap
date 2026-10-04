package com.skillswap.backend.controller;

import com.skillswap.backend.entity.SwapRequest;
import com.skillswap.backend.repository.SwapRequestRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/swap-requests")
public class SwapRequestController {

    private final SwapRequestRepository swapRequestRepository;

    public SwapRequestController(
            SwapRequestRepository swapRequestRepository) {
        this.swapRequestRepository = swapRequestRepository;
    }

    /*
     * Send a new skill-swap request.
     *
     * The requester email is NEVER taken from the browser.
     * It comes from the authenticated Spring Security session.
     */
    @PostMapping
    public ResponseEntity<?> sendRequest(
            @RequestBody SwapRequest request,
            Authentication authentication) {

        String authenticatedEmail = authentication.getName();

        /*
         * The logged-in user cannot send a request as someone else.
         */
        request.setRequesterEmail(authenticatedEmail);

        /*
         * Receiver must be provided by the frontend.
         */
        if (request.getReceiverEmail() == null ||
                request.getReceiverEmail().isBlank()) {

            Map<String, String> response = new HashMap<>();
            response.put(
                    "message",
                    "Receiver email is required"
            );

            return ResponseEntity
                    .badRequest()
                    .body(response);
        }

        /*
         * Prevent sending a request to yourself.
         */
        if (authenticatedEmail.equalsIgnoreCase(
                request.getReceiverEmail())) {

            Map<String, String> response = new HashMap<>();
            response.put(
                    "message",
                    "You cannot send a request to yourself"
            );

            return ResponseEntity
                    .badRequest()
                    .body(response);
        }

        /*
         * Prevent duplicate active requests.
         */
        Optional<SwapRequest> existingRequest =
                swapRequestRepository
                        .findByRequesterEmailAndReceiverEmailAndStatusIn(
                                authenticatedEmail,
                                request.getReceiverEmail(),
                                List.of("PENDING", "ACCEPTED")
                        );

        if (existingRequest.isPresent()) {
            return ResponseEntity
                    .ok(existingRequest.get());
        }

        request.setStatus("PENDING");

        SwapRequest savedRequest =
                swapRequestRepository.save(request);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(savedRequest);
    }

    /*
     * Get requests received by the currently logged-in user.
     *
     * No email parameter is trusted from the frontend.
     */
    @GetMapping("/received")
    public ResponseEntity<List<SwapRequest>> getReceivedRequests(
            Authentication authentication) {

        String authenticatedEmail = authentication.getName();

        List<SwapRequest> requests =
                swapRequestRepository
                        .findByReceiverEmail(authenticatedEmail);

        return ResponseEntity.ok(requests);
    }

    /*
     * Get requests sent by the currently logged-in user.
     *
     * No email parameter is trusted from the frontend.
     */
    @GetMapping("/sent")
    public ResponseEntity<List<SwapRequest>> getSentRequests(
            Authentication authentication) {

        String authenticatedEmail = authentication.getName();

        List<SwapRequest> requests =
                swapRequestRepository
                        .findByRequesterEmail(authenticatedEmail);

        return ResponseEntity.ok(requests);
    }

    /*
     * Accept a request.
     *
     * Only the person who RECEIVED the request can accept it.
     */
    @PutMapping("/{id}/accept")
    public ResponseEntity<String> acceptRequest(
            @PathVariable Long id,
            Authentication authentication) {

        String authenticatedEmail = authentication.getName();

        SwapRequest request =
                swapRequestRepository.findById(id)
                        .orElse(null);

        if (request == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("Request not found");
        }

        /*
         * Make sure only the receiver can accept this request.
         */
        if (!authenticatedEmail.equalsIgnoreCase(
                request.getReceiverEmail())) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(
                            "You are not allowed to accept this request"
                    );
        }

        /*
         * Do not accept an already rejected request.
         */
        if (!"PENDING".equalsIgnoreCase(
                request.getStatus())) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Only pending requests can be accepted"
                    );
        }

        request.setStatus("ACCEPTED");

        swapRequestRepository.save(request);

        return ResponseEntity.ok(
                "Swap request accepted"
        );
    }

    /*
     * Reject a request.
     *
     * Only the person who RECEIVED the request can reject it.
     */
    @PutMapping("/{id}/reject")
    public ResponseEntity<String> rejectRequest(
            @PathVariable Long id,
            Authentication authentication) {

        String authenticatedEmail = authentication.getName();

        SwapRequest request =
                swapRequestRepository.findById(id)
                        .orElse(null);

        if (request == null) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body("Request not found");
        }

        /*
         * Make sure only the receiver can reject this request.
         */
        if (!authenticatedEmail.equalsIgnoreCase(
                request.getReceiverEmail())) {

            return ResponseEntity
                    .status(HttpStatus.FORBIDDEN)
                    .body(
                            "You are not allowed to reject this request"
                    );
        }

        /*
         * Only pending requests can be rejected.
         */
        if (!"PENDING".equalsIgnoreCase(
                request.getStatus())) {

            return ResponseEntity
                    .badRequest()
                    .body(
                            "Only pending requests can be rejected"
                    );
        }

        request.setStatus("REJECTED");

        swapRequestRepository.save(request);

        return ResponseEntity.ok(
                "Swap request rejected"
        );
    }
}