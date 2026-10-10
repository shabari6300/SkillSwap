
package com.skillswap.backend.controller;

import com.skillswap.backend.entity.SkillJourney;
import com.skillswap.backend.entity.SkillMilestone;
import com.skillswap.backend.repository.SkillJourneyRepository;

import jakarta.transaction.Transactional;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/skill-journeys")
@Transactional
public class SkillJourneyController {

    private final SkillJourneyRepository journeyRepository;

    public SkillJourneyController(
            SkillJourneyRepository journeyRepository) {
        this.journeyRepository = journeyRepository;
    }

    @GetMapping
    public List<Map<String, Object>> getJourneys(
            Authentication authentication) {

        String email = authentication.getName();

        return journeyRepository
                .findByUserEmailIgnoreCaseOrderByCreatedAtDesc(email)
                .stream()
                .map(this::journeyToMap)
                .toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> createJourney(
            @RequestBody CreateJourneyRequest request,
            Authentication authentication) {

        String title = clean(request.title());
        String skillName = clean(request.skillName());
        String description = clean(request.goalDescription());

        if (title.isEmpty() || title.length() > 120) {
            throw badRequest(
                    "Title is required and must be at most 120 characters."
            );
        }

        if (skillName.isEmpty() || skillName.length() > 100) {
            throw badRequest(
                    "Skill name is required and must be at most 100 characters."
            );
        }

        if (description.length() > 1000) {
            throw badRequest(
                    "Goal description must be at most 1000 characters."
            );
        }

        if (request.targetDate() != null
                && request.targetDate().isBefore(LocalDate.now())) {
            throw badRequest("Target date cannot be in the past.");
        }

        SkillJourney journey = new SkillJourney();
        journey.setUserEmail(authentication.getName());
        journey.setTitle(title);
        journey.setSkillName(skillName);
        journey.setGoalDescription(
                description.isEmpty() ? null : description
        );
        journey.setTargetDate(request.targetDate());
        journey.setProgressPercent(0);
        journey.setStatus("IN_PROGRESS");

        return journeyToMap(journeyRepository.save(journey));
    }

    @PostMapping("/{journeyId}/milestones")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> addMilestone(
            @PathVariable Long journeyId,
            @RequestBody CreateMilestoneRequest request,
            Authentication authentication) {

        SkillJourney journey = getOwnedJourney(
                journeyId, authentication.getName()
        );

        String title = clean(request.title());
        String description = clean(request.description());

        if (title.isEmpty() || title.length() > 120) {
            throw badRequest(
                    "Milestone title is required and must be at most 120 characters."
            );
        }

        if (description.length() > 600) {
            throw badRequest(
                    "Milestone description must be at most 600 characters."
            );
        }

        if (request.targetDate() != null
                && request.targetDate().isBefore(LocalDate.now())) {
            throw badRequest(
                    "Milestone target date cannot be in the past."
            );
        }

        SkillMilestone milestone = new SkillMilestone();
        milestone.setJourney(journey);
        milestone.setTitle(title);
        milestone.setDescription(
                description.isEmpty() ? null : description
        );
        milestone.setTargetDate(request.targetDate());
        milestone.setCompleted(false);

        journey.getMilestones().add(milestone);

        updateProgress(journey);

        return journeyToMap(journeyRepository.save(journey));
    }

    @PutMapping("/{journeyId}/milestones/{milestoneId}/completion")
    public Map<String, Object> updateMilestoneCompletion(
            @PathVariable Long journeyId,
            @PathVariable Long milestoneId,
            @RequestBody CompletionRequest request,
            Authentication authentication) {

        SkillJourney journey = getOwnedJourney(
                journeyId, authentication.getName()
        );

        SkillMilestone milestone = journey.getMilestones()
                .stream()
                .filter(item -> item.getId() != null
                        && item.getId().equals(milestoneId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Milestone not found."
                ));

        milestone.setCompleted(request.completed());

        milestone.setCompletedAt(
                request.completed() ? LocalDateTime.now() : null
        );

        updateProgress(journey);

        return journeyToMap(journeyRepository.save(journey));
    }

    @DeleteMapping("/{journeyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteJourney(
            @PathVariable Long journeyId,
            Authentication authentication) {

        SkillJourney journey = getOwnedJourney(
                journeyId, authentication.getName()
        );

        journeyRepository.delete(journey);
    }

    private SkillJourney getOwnedJourney(
            Long journeyId, String email) {

        SkillJourney journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Learning journey not found."
                ));

        if (journey.getUserEmail() == null
                || !journey.getUserEmail().equalsIgnoreCase(email)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Learning journey not found."
            );
        }

        return journey;
    }

    private void updateProgress(SkillJourney journey) {
        List<SkillMilestone> milestones = journey.getMilestones();

        if (milestones == null || milestones.isEmpty()) {
            journey.setProgressPercent(0);
            journey.setStatus("IN_PROGRESS");
            return;
        }

        long completedCount = milestones.stream()
                .filter(SkillMilestone::isCompleted)
                .count();

        int progress = (int) Math.round(
                completedCount * 100.0 / milestones.size()
        );

        journey.setProgressPercent(progress);
        journey.setStatus(
                progress == 100 ? "COMPLETED" : "IN_PROGRESS"
        );
    }

    private Map<String, Object> journeyToMap(SkillJourney journey) {
        Map<String, Object> result = new LinkedHashMap<>();

        result.put("id", journey.getId());
        result.put("title", journey.getTitle());
        result.put("skillName", journey.getSkillName());
        result.put("goalDescription", journey.getGoalDescription());
        result.put("targetDate", journey.getTargetDate());
        result.put("progressPercent", journey.getProgressPercent());
        result.put("status", journey.getStatus());
        result.put("createdAt", journey.getCreatedAt());
        result.put("updatedAt", journey.getUpdatedAt());

        List<Map<String, Object>> milestoneResults = new ArrayList<>();

        if (journey.getMilestones() != null) {
            for (SkillMilestone milestone : journey.getMilestones()) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", milestone.getId());
                item.put("title", milestone.getTitle());
                item.put("description", milestone.getDescription());
                item.put("targetDate", milestone.getTargetDate());
                item.put("completed", milestone.isCompleted());
                item.put("completedAt", milestone.getCompletedAt());

                milestoneResults.add(item);
            }
        }

        result.put("milestones", milestoneResults);

        return result;
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST, message
        );
    }

    public record CreateJourneyRequest(
            String title,
            String skillName,
            String goalDescription,
            LocalDate targetDate) {
    }

    public record CreateMilestoneRequest(
            String title,
            String description,
            LocalDate targetDate) {
    }

    public record CompletionRequest(boolean completed) {
    }
}
