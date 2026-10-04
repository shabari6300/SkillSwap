package com.skillswap.backend.controller;

import com.skillswap.backend.dto.LoginRequest;
import com.skillswap.backend.dto.SkillUpdateRequest;
import com.skillswap.backend.entity.User;
import com.skillswap.backend.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final SessionAuthenticationStrategy sessionAuthenticationStrategy;

    public UserController(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository,
            SessionAuthenticationStrategy sessionAuthenticationStrategy) {

        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.sessionAuthenticationStrategy =
                sessionAuthenticationStrategy;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @RequestBody User user) {

        if (userRepository.findByEmail(user.getEmail()).isPresent()) {

            Map<String, Object> response = new HashMap<>();
            response.put(
                    "message",
                    "Email already registered"
            );

            return ResponseEntity
                    .status(HttpStatus.CONFLICT)
                    .body(response);
        }

        user.setPassword(
                passwordEncoder.encode(user.getPassword())
        );

        User savedUser =
                userRepository.save(user);

        Map<String, Object> response =
                new HashMap<>();

        response.put(
                "message",
                "Registration successful"
        );

        response.put(
                "name",
                savedUser.getName()
        );

        response.put(
                "email",
                savedUser.getEmail()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        try {

            UsernamePasswordAuthenticationToken token =
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()
                    );

            Authentication authentication =
                    authenticationManager.authenticate(token);

            sessionAuthenticationStrategy.onAuthentication(
                    authentication,
                    httpRequest,
                    httpResponse
            );

            SecurityContext context =
                    SecurityContextHolder.createEmptyContext();

            context.setAuthentication(authentication);

            SecurityContextHolder.setContext(context);

            securityContextRepository.saveContext(
                    context,
                    httpRequest,
                    httpResponse
            );

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "message",
                    "Login successful"
            );

            response.put(
                    "email",
                    authentication.getName()
            );

            return ResponseEntity.ok(response);

        } catch (AuthenticationException exception) {

            SecurityContextHolder.clearContext();

            Map<String, Object> response =
                    new HashMap<>();

            response.put(
                    "message",
                    "Invalid email or password"
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(response);
        }
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> currentUser(
            Authentication authentication) {

        String email =
                authentication.getName();

        User user = userRepository
                .findByEmail(email)
                .orElse(null);

        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .build();
        }

        Map<String, Object> response =
                new HashMap<>();

        response.put("name", user.getName());
        response.put("email", user.getEmail());
        response.put(
                "teachSkill",
                user.getTeachSkill()
        );
        response.put(
                "learnSkill",
                user.getLearnSkill()
        );

        response.put(
                "bio",
                user.getBio()
        );
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

        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication) {

        new SecurityContextLogoutHandler()
                .logout(
                        request,
                        response,
                        authentication
                );

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/skills")
    public ResponseEntity<Map<String, String>> updateSkills(
            @RequestBody SkillUpdateRequest request,
            Authentication authentication) {

        String authenticatedEmail =
                authentication.getName();

        User user = userRepository
                .findByEmail(authenticatedEmail)
                .orElse(null);

        if (user == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .build();
        }

        user.setTeachSkill(
                request.getTeachSkill()
        );

        user.setLearnSkill(
                request.getLearnSkill()
        );

        userRepository.save(user);

        Map<String, String> response =
                new HashMap<>();

        response.put(
                "message",
                "Skills saved successfully"
        );

        return ResponseEntity.ok(response);
    }
}