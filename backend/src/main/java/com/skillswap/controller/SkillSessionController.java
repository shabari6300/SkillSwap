
package com.skillswap.backend.controller;

import com.skillswap.backend.entity.SkillSession;
import com.skillswap.backend.repository.SkillSessionRepository;
import com.skillswap.backend.repository.SwapRequestRepository;
import com.skillswap.backend.repository.UserRepository;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/sessions")
public class SkillSessionController {

    private static final ZoneId APP_ZONE =
            ZoneId.of("Asia/Kolkata");

    private final SkillSessionRepository sessionRepository;
    private final SwapRequestRepository swapRequestRepository;
    private final UserRepository userRepository;

    public SkillSessionController(
            SkillSessionRepository sessionRepository,
            SwapRequestRepository swapRequestRepository,
            UserRepository userRepository
    ) {
        this.sessionRepository = sessionRepository;
        this.swapRequestRepository = swapRequestRepository;
        this.userRepository = userRepository;
    }

    /*
     * Create a session invitation for an accepted connection.
     * The organizer's email comes from the authenticated session.
     */
    @PostMapping
    public ResponseEntity<?> createSession(
            @RequestBody CreateSessionRequest input,
            Authentication authentication
    ) {
        String organizerEmail = authentication.getName();

        if (input == null) {
            return error(HttpStatus.BAD_REQUEST,
                    "Session details are required.");
        }

        String partnerEmail = clean(input.getPartnerEmail());
        String title = clean(input.getTitle());
        String skill = clean(input.getSkill());
        String notes = clean(input.getNotes());

        if (partnerEmail.isBlank()) {
            return error(HttpStatus.BAD_REQUEST,
                    "A partner email is required.");
        }

        if (organizerEmail.equalsIgnoreCase(partnerEmail)) {
            return error(HttpStatus.BAD_REQUEST,
                    "You cannot schedule a session with yourself.");
        }

        if (title.isBlank() || title.length() > 100) {
            return error(HttpStatus.BAD_REQUEST,
                    "Title is required and must be at most 100 characters.");
        }

        if (skill.isBlank() || skill.length() > 100) {
            return error(HttpStatus.BAD_REQUEST,
                    "Skill is required and must be at most 100 characters.");
        }

        if (notes.length() > 2000) {
            return error(HttpStatus.BAD_REQUEST,
                    "Notes cannot exceed 2000 characters.");
        }

        if (input.getScheduledAt() == null) {
            return error(HttpStatus.BAD_REQUEST,
                    "Choose a date and time for the session.");
        }

        LocalDateTime now = LocalDateTime.now(APP_ZONE);

        if (!input.getScheduledAt().isAfter(now)) {
            return error(HttpStatus.BAD_REQUEST,
                    "The session must be scheduled in the future.");
        }

        Integer duration = input.getDurationMinutes();

        if (duration == null ||
                duration < 15 ||
                duration > 240) {
            return error(HttpStatus.BAD_REQUEST,
                    "Duration must be between 15 and 240 minutes.");
        }

        if (userRepository.findByEmail(partnerEmail).isEmpty()) {
            return error(HttpStatus.BAD_REQUEST,
                    "The partner account could not be found.");
        }

        boolean acceptedConnection =
                swapRequestRepository.existsAcceptedConnectionBetween(
                        organizerEmail,
                        partnerEmail
                );

        if (!acceptedConnection) {
            return error(HttpStatus.FORBIDDEN,
                    "Sessions are available only with accepted connections.");
        }

        SkillSession session = new SkillSession();

        session.setOrganizerEmail(organizerEmail);
        session.setPartnerEmail(partnerEmail);
        session.setTitle(title);
        session.setSkill(skill);
        session.setScheduledAt(input.getScheduledAt());
        session.setDurationMinutes(duration);
        session.setNotes(notes);
        session.setStatus("PENDING");

        SkillSession saved = sessionRepository.save(session);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(saved);
    }

    /*
     * List sessions involving the authenticated user.
     */
    @GetMapping
    public ResponseEntity<List<SkillSession>> getMySessions(
            Authentication authentication
    ) {
        String email = authentication.getName();

        List<SkillSession> sessions =
                sessionRepository
                        .findByOrganizerEmailIgnoreCaseOrPartnerEmailIgnoreCaseOrderByScheduledAtAsc(
                                email,
                                email
                        );

        return ResponseEntity.ok(sessions);
    }

    /*
     * Only the invited partner can accept a session.
     */
    @PutMapping("/{id}/accept")
    public ResponseEntity<?> acceptSession(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Optional<SkillSession> found =
                sessionRepository.findById(id);

        if (found.isEmpty()) {
            return error(HttpStatus.NOT_FOUND,
                    "Session not found.");
        }

        SkillSession session = found.get();
        String email = authentication.getName();

        if (!session.getPartnerEmail().equalsIgnoreCase(email)) {
            return error(HttpStatus.FORBIDDEN,
                    "Only the invited partner can accept this session.");
        }

        if (!"PENDING".equals(session.getStatus())) {
            return error(HttpStatus.BAD_REQUEST,
                    "Only pending sessions can be accepted.");
        }

        if (!session.getScheduledAt().isAfter(
                LocalDateTime.now(APP_ZONE))) {
            return error(HttpStatus.BAD_REQUEST,
                    "This session time has already passed.");
        }

        session.setStatus("ACCEPTED");

        return ResponseEntity.ok(
                sessionRepository.save(session)
        );
    }

    /*
     * Either participant can cancel a pending or accepted session.
     */
    @PutMapping("/{id}/cancel")
    public ResponseEntity<?> cancelSession(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Optional<SkillSession> found =
                sessionRepository.findById(id);

        if (found.isEmpty()) {
            return error(HttpStatus.NOT_FOUND,
                    "Session not found.");
        }

        SkillSession session = found.get();
        String email = authentication.getName();

        if (!isParticipant(session, email)) {
            return error(HttpStatus.FORBIDDEN,
                    "You are not a participant in this session.");
        }

        String status = session.getStatus();

        if (!"PENDING".equals(status) &&
                !"ACCEPTED".equals(status)) {
            return error(HttpStatus.BAD_REQUEST,
                    "This session can no longer be cancelled.");
        }

        session.setStatus("CANCELLED");

        return ResponseEntity.ok(
                sessionRepository.save(session)
        );
    }

    /*
     * Either participant can mark an accepted session completed,
     * but only after its scheduled end time.
     */
    @PutMapping("/{id}/complete")
    public ResponseEntity<?> completeSession(
            @PathVariable Long id,
            Authentication authentication
    ) {
        Optional<SkillSession> found =
                sessionRepository.findById(id);

        if (found.isEmpty()) {
            return error(HttpStatus.NOT_FOUND,
                    "Session not found.");
        }

        SkillSession session = found.get();
        String email = authentication.getName();

        if (!isParticipant(session, email)) {
            return error(HttpStatus.FORBIDDEN,
                    "You are not a participant in this session.");
        }

        if (!"ACCEPTED".equals(session.getStatus())) {
            return error(HttpStatus.BAD_REQUEST,
                    "Only accepted sessions can be completed.");
        }

        LocalDateTime endTime =
                session.getScheduledAt().plusMinutes(
                        session.getDurationMinutes()
                );

        if (endTime.isAfter(LocalDateTime.now(APP_ZONE))) {
            return error(HttpStatus.BAD_REQUEST,
                    "The scheduled session has not ended yet.");
        }

        session.setStatus("COMPLETED");

        return ResponseEntity.ok(
                sessionRepository.save(session)
        );
    }

    private boolean isParticipant(
            SkillSession session,
            String email
    ) {
        return session.getOrganizerEmail().equalsIgnoreCase(email)
                || session.getPartnerEmail().equalsIgnoreCase(email);
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private ResponseEntity<Map<String, String>> error(
            HttpStatus status,
            String message
    ) {
        Map<String, String> body = new HashMap<>();
        body.put("message", message);

        return ResponseEntity.status(status).body(body);
    }

    public static class CreateSessionRequest {

        private String partnerEmail;
        private String title;
        private String skill;
        private LocalDateTime scheduledAt;
        private Integer durationMinutes;
        private String notes;

        public CreateSessionRequest() {
        }

        public String getPartnerEmail() {
            return partnerEmail;
        }

        public void setPartnerEmail(String partnerEmail) {
            this.partnerEmail = partnerEmail;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        public String getSkill() {
            return skill;
        }

        public void setSkill(String skill) {
            this.skill = skill;
        }

        public LocalDateTime getScheduledAt() {
            return scheduledAt;
        }

        public void setScheduledAt(LocalDateTime scheduledAt) {
            this.scheduledAt = scheduledAt;
        }

        public Integer getDurationMinutes() {
            return durationMinutes;
        }

        public void setDurationMinutes(Integer durationMinutes) {
            this.durationMinutes = durationMinutes;
        }

        public String getNotes() {
            return notes;
        }

        public void setNotes(String notes) {
            this.notes = notes;
        }
    }
}

