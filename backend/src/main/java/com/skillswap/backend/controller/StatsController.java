package com.skillswap.backend.controller;

import com.skillswap.backend.entity.SwapRequest;
import com.skillswap.backend.entity.User;
import com.skillswap.backend.repository.SwapRequestRepository;
import com.skillswap.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    private final UserRepository userRepository;
    private final SwapRequestRepository swapRequestRepository;

    public StatsController(
            UserRepository userRepository,
            SwapRequestRepository swapRequestRepository) {

        this.userRepository = userRepository;
        this.swapRequestRepository = swapRequestRepository;
    }

    @GetMapping
    public Map<String, Object> getStats(
            Authentication authentication) {

        Map<String, Object> stats = new HashMap<>();

        /*
         * Get the logged-in user's email directly
         * from the Spring Security session.
         */
        String authenticatedEmail =
                authentication.getName();

        User currentUser =
                userRepository.findByEmail(authenticatedEmail)
                        .orElse(null);

        if (currentUser == null) {
            stats.put("message", "User not found");
            return stats;
        }

        int matchCount = 0;

        String myTeachSkill = currentUser.getTeachSkill();
        String myLearnSkill = currentUser.getLearnSkill();

        /*
         * Count mutual skill matches.
         */
        if (myTeachSkill != null &&
                myLearnSkill != null) {

            for (User otherUser : userRepository.findAll()) {

                if (otherUser.getEmail()
                        .equalsIgnoreCase(
                                currentUser.getEmail())) {
                    continue;
                }

                String otherTeachSkill =
                        otherUser.getTeachSkill();

                String otherLearnSkill =
                        otherUser.getLearnSkill();

                if (otherTeachSkill == null ||
                        otherLearnSkill == null) {
                    continue;
                }

                boolean mutualMatch =
                        myLearnSkill.trim()
                                .equalsIgnoreCase(
                                        otherTeachSkill.trim())
                        &&
                        myTeachSkill.trim()
                                .equalsIgnoreCase(
                                        otherLearnSkill.trim());

                if (mutualMatch) {
                    matchCount++;
                }
            }
        }

        /*
         * Get received requests using the
         * authenticated user's email.
         */
        List<SwapRequest> receivedRequests =
                swapRequestRepository
                        .findByReceiverEmail(
                                authenticatedEmail);

        long pendingRequests =
                receivedRequests.stream()
                        .filter(request ->
                                "PENDING".equalsIgnoreCase(
                                        request.getStatus()))
                        .count();

        /*
         * Get sent requests using the
         * authenticated user's email.
         */
        List<SwapRequest> sentRequests =
                swapRequestRepository
                        .findByRequesterEmail(
                                authenticatedEmail);

        /*
         * Build the set of accepted connections.
         */
        Set<String> connectionEmails =
                new HashSet<>();

        for (SwapRequest request : sentRequests) {

            if ("ACCEPTED".equalsIgnoreCase(
                    request.getStatus())) {

                connectionEmails.add(
                        request.getReceiverEmail());
            }
        }

        for (SwapRequest request :
                receivedRequests) {

            if ("ACCEPTED".equalsIgnoreCase(
                    request.getStatus())) {

                connectionEmails.add(
                        request.getRequesterEmail());
            }
        }

        stats.put("matches", matchCount);
        stats.put("pendingRequests", pendingRequests);
        stats.put("connections", connectionEmails.size());

        return stats;
    }
}