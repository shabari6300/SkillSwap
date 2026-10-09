package com.skillswap.backend.controller;

import com.skillswap.backend.service.PasswordResetService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    public PasswordResetController(
            PasswordResetService passwordResetService
    ) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody Map<String, String> request
    ) {

        String email = request.get("email");

        passwordResetService.requestPasswordReset(email);

        Map<String, String> response = new HashMap<>();

        response.put(
                "message",
                "If an account with that email exists, a password reset link has been sent."
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestBody Map<String, String> request
    ) {

        try {
            String token = request.get("token");
            String newPassword = request.get("newPassword");

            passwordResetService.resetPassword(
                    token,
                    newPassword
            );

            Map<String, String> response = new HashMap<>();

            response.put(
                    "message",
                    "Password reset successful. You can now log in."
            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {

            Map<String, String> response = new HashMap<>();

            response.put(
                    "message",
                    exception.getMessage()
            );

            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(response);
        }
    }
}