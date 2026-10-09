package com.skillswap.backend.entity;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(
        name = "password_reset_token",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_password_reset_token_hash",
                        columnNames = "token_hash"
                )
        }
)
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 320)
    private String email;

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private boolean used = false;

    public PasswordResetToken() {
    }

    public PasswordResetToken(
            String email,
            String tokenHash,
            Instant expiresAt
    ) {
        this.email = email;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.used = false;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getTokenHash() {
        return tokenHash;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public boolean isUsed() {
        return used;
    }

    public void setUsed(boolean used) {
        this.used = used;
    }
}