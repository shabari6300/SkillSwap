package com.skillswap.backend.service;

import com.skillswap.backend.entity.PasswordResetToken;
import com.skillswap.backend.entity.User;
import com.skillswap.backend.repository.PasswordResetTokenRepository;
import com.skillswap.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;

@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private final SecureRandom secureRandom = new SecureRandom();

    private final HttpClient httpClient = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NORMAL)
            .connectTimeout(Duration.ofSeconds(15))
            .build();

    @Value("${MAIL_BRIDGE_URL:}")
    private String mailBridgeUrl;

    @Value("${MAIL_BRIDGE_SECRET:}")
    private String mailBridgeSecret;

    @Value("${APP_BASE_URL:https://skillswap-o479.onrender.com}")
    private String baseUrl;

    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            org.springframework.security.crypto.password.PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void requestPasswordReset(String email) {

        if (email == null || email.isBlank()) {
            return;
        }

        if (mailBridgeUrl.isBlank() || mailBridgeSecret.isBlank()) {
            throw new IllegalStateException(
                    "Password reset email service is not configured"
            );
        }

        User user = userRepository
                .findByEmail(email.trim())
                .orElse(null);

        // Do not reveal whether an email is registered.
        if (user == null) {
            return;
        }

        // Remove any previous reset token for this account.
        tokenRepository.deleteByEmailIgnoreCase(user.getEmail());

        String rawToken = generateToken();
        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = new PasswordResetToken(
                user.getEmail(),
                tokenHash,
                Instant.now().plus(15, ChronoUnit.MINUTES)
        );

        tokenRepository.save(resetToken);

        String normalizedBaseUrl = baseUrl.replaceAll("/+$", "");
        String resetUrl = normalizedBaseUrl
                + "/?resetToken=" + rawToken;

        String jsonBody = "{"
                + "\"secret\":\"" + jsonEscape(mailBridgeSecret) + "\","
                + "\"to\":\"" + jsonEscape(user.getEmail()) + "\","
                + "\"name\":\"" + jsonEscape(user.getName()) + "\","
                + "\"resetUrl\":\"" + jsonEscape(resetUrl) + "\""
                + "}";

        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(mailBridgeUrl))
                    .timeout(Duration.ofSeconds(30))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(
                            jsonBody,
                            StandardCharsets.UTF_8
                    ))
                    .build();

            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );

            if (response.statusCode() < 200
                    || response.statusCode() >= 300
                    || !response.body().matches(
                            "(?s).*\\\"ok\\\"\\s*:\\s*true.*"
                    )) {
                throw new IllegalStateException(
                        "The email service did not confirm delivery"
                );
            }

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();

            throw new IllegalStateException(
                    "Password reset email request was interrupted"
            );

        } catch (IOException | IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "Could not contact the password reset email service"
            );
        }
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {

        if (rawToken == null || rawToken.isBlank()) {
            throw new IllegalArgumentException("Invalid reset link");
        }

        if (newPassword == null || newPassword.length() < 8) {
            throw new IllegalArgumentException(
                    "Password must contain at least 8 characters"
            );
        }

        String tokenHash = hashToken(rawToken);

        PasswordResetToken resetToken = tokenRepository
                .findByTokenHash(tokenHash)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Invalid or expired reset link"
                ));

        if (resetToken.isUsed()) {
            throw new IllegalArgumentException(
                    "This reset link has already been used"
            );
        }

        if (resetToken.getExpiresAt().isBefore(Instant.now())) {
            tokenRepository.delete(resetToken);

            throw new IllegalArgumentException(
                    "This reset link has expired"
            );
        }

        User user = userRepository
                .findByEmail(resetToken.getEmail())
                .orElseThrow(() -> new IllegalArgumentException(
                        "User account not found"
                ));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // A reset link can only be used once.
        tokenRepository.delete(resetToken);
    }

    private String generateToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest =
                    MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    token.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(
                    "SHA-256 is unavailable",
                    exception
            );
        }
    }

    private String jsonEscape(String value) {
        if (value == null) {
            return "";
        }

        StringBuilder result = new StringBuilder();

        for (char character : value.toCharArray()) {
            switch (character) {
                case '"' -> result.append("\\\"");
                case '\\' -> result.append("\\\\");
                case '\b' -> result.append("\\b");
                case '\f' -> result.append("\\f");
                case '\n' -> result.append("\\n");
                case '\r' -> result.append("\\r");
                case '\t' -> result.append("\\t");
                default -> {
                    if (character < 0x20) {
                        result.append(String.format(
                                "\\u%04x",
                                (int) character
                        ));
                    } else {
                        result.append(character);
                    }
                }
            }
        }

        return result.toString();
    }
}