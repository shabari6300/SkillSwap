package com.skillswap.backend.controller;

import com.skillswap.backend.entity.User;
import com.skillswap.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public Map<String, Object> getProfile(
            Authentication authentication) {

        String authenticatedEmail =
                authentication.getName();

        User user = userRepository
                .findByEmail(authenticatedEmail)
                .orElse(null);

        Map<String, Object> response =
                new HashMap<>();

        if (user == null) {
            response.put("message", "User not found");
            return response;
        }

        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("teachSkill", user.getTeachSkill());
        response.put("learnSkill", user.getLearnSkill());

        response.put("bio", user.getBio());
        response.put(
                "experienceLevel",
                user.getExperienceLevel()
        );
        response.put(
                "teachDescription",
                user.getTeachDescription()
        );
        response.put(
                "learnDescription",
                user.getLearnDescription()
        );

        return response;
    }

    @PutMapping
    public Map<String, Object> updateProfile(
            @RequestBody Map<String, String> data,
            Authentication authentication) {

        String authenticatedEmail =
                authentication.getName();

        User user = userRepository
                .findByEmail(authenticatedEmail)
                .orElse(null);

        Map<String, Object> response =
                new HashMap<>();

        if (user == null) {
            response.put("message", "User not found");
            return response;
        }

        /*
         * The authenticated session determines
         * whose profile is being updated.
         */

        if (data.get("name") != null) {
            user.setName(data.get("name"));
        }

        if (data.get("teachSkill") != null) {
            user.setTeachSkill(
                    data.get("teachSkill")
            );
        }

        if (data.get("learnSkill") != null) {
            user.setLearnSkill(
                    data.get("learnSkill")
            );
        }

        if (data.get("bio") != null) {
            user.setBio(data.get("bio"));
        }

        if (data.get("experienceLevel") != null) {
            user.setExperienceLevel(
                    data.get("experienceLevel")
            );
        }

        if (data.get("teachDescription") != null) {
            user.setTeachDescription(
                    data.get("teachDescription")
            );
        }

        if (data.get("learnDescription") != null) {
            user.setLearnDescription(
                    data.get("learnDescription")
            );
        }

        userRepository.save(user);

        response.put(
                "message",
                "Profile updated successfully!"
        );

        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put("teachSkill", user.getTeachSkill());
        response.put("learnSkill", user.getLearnSkill());

        response.put("bio", user.getBio());
        response.put(
                "experienceLevel",
                user.getExperienceLevel()
        );
        response.put(
                "teachDescription",
                user.getTeachDescription()
        );
        response.put(
                "learnDescription",
                user.getLearnDescription()
        );

        return response;
    }
}