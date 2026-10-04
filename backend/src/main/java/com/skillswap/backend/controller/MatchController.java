package com.skillswap.backend.controller;

import com.skillswap.backend.entity.User;
import com.skillswap.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

    private final UserRepository userRepository;

    public MatchController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Map<String, Object>> findMatches(
            Authentication authentication) {

        String authenticatedEmail =
                authentication.getName();

        User currentUser =
                userRepository.findByEmail(authenticatedEmail)
                        .orElse(null);

        if (currentUser == null) {
            return List.of();
        }

        List<User> matchedUsers =
                userRepository
                        .findByTeachSkillAndLearnSkillAndEmailNot(
                                currentUser.getLearnSkill(),
                                currentUser.getTeachSkill(),
                                currentUser.getEmail()
                        );

        List<Map<String, Object>> safeMatches =
                new ArrayList<>();

        for (User user : matchedUsers) {

            Map<String, Object> safeUser =
                    new HashMap<>();

            safeUser.put("id", user.getId());
            safeUser.put("name", user.getName());
            safeUser.put("email", user.getEmail());
            safeUser.put(
                    "teachSkill",
                    user.getTeachSkill()
            );
            safeUser.put(
                    "learnSkill",
                    user.getLearnSkill()
            );

            safeMatches.add(safeUser);
        }

        return safeMatches;
    }
}