package com.skillswap.backend.controller;

import com.cloudinary.Cloudinary;
import com.skillswap.backend.entity.Document;
import com.skillswap.backend.entity.SwapRequest;
import com.skillswap.backend.entity.User;
import com.skillswap.backend.repository.DocumentRepository;
import com.skillswap.backend.repository.SwapRequestRepository;
import com.skillswap.backend.repository.UserRepository;
import com.skillswap.backend.service.CloudinaryService;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.util.*;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final SwapRequestRepository swapRequestRepository;
    private final CloudinaryService cloudinaryService;
    private final Cloudinary cloudinary;

    public DocumentController(
            DocumentRepository documentRepository,
            UserRepository userRepository,
            SwapRequestRepository swapRequestRepository,
            CloudinaryService cloudinaryService,
            Cloudinary cloudinary
    ) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.swapRequestRepository = swapRequestRepository;
        this.cloudinaryService = cloudinaryService;
        this.cloudinary = cloudinary;
    }

    @GetMapping("/connections")
    public ResponseEntity<?> getConnections(
            Authentication authentication
    ) {

        String currentEmail = authentication.getName();

        List<SwapRequest> sentRequests =
                swapRequestRepository.findByRequesterEmail(currentEmail);

        List<SwapRequest> receivedRequests =
                swapRequestRepository.findByReceiverEmail(currentEmail);

        Set<String> connectedEmails = new LinkedHashSet<>();

        for (SwapRequest request : sentRequests) {
            if ("ACCEPTED".equalsIgnoreCase(request.getStatus())) {
                connectedEmails.add(request.getReceiverEmail());
            }
        }

        for (SwapRequest request : receivedRequests) {
            if ("ACCEPTED".equalsIgnoreCase(request.getStatus())) {
                connectedEmails.add(request.getRequesterEmail());
            }
        }

        List<Map<String, Object>> connections = new ArrayList<>();

        for (String email : connectedEmails) {

            Optional<User> optionalUser =
                    userRepository.findByEmail(email);

            if (optionalUser.isPresent()) {

                User user = optionalUser.get();

                Map<String, Object> connection = new HashMap<>();

                connection.put("id", user.getId());
                connection.put("name", user.getName());
                connection.put("email", user.getEmail());

                connections.add(connection);
            }
        }

        connections.sort(
                Comparator.comparing(
                        item -> String.valueOf(item.get("name")),
                        String.CASE_INSENSITIVE_ORDER
                )
        );

        return ResponseEntity.ok(connections);
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam("connectionUserId") Long connectionUserId,
            Authentication authentication
    ) {

        try {

            if (file == null || file.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Please select a file."
                        ));
            }

            if (file.getSize() > 10 * 1024 * 1024) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "File size must be 10 MB or less."
                        ));
            }

            String currentEmail = authentication.getName();

            Optional<User> currentUserOptional =
                    userRepository.findByEmail(currentEmail);

            if (currentUserOptional.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of(
                                "message",
                                "Current user not found."
                        ));
            }

            User currentUser = currentUserOptional.get();

            Optional<User> targetUserOptional =
                    userRepository.findById(connectionUserId);

            if (targetUserOptional.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "Connection user not found."
                        ));
            }

            User targetUser = targetUserOptional.get();

            if (currentUser.getId().equals(targetUser.getId())) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "You cannot share a resource with yourself."
                        ));
            }

            if (!isAcceptedConnection(
                    currentEmail,
                    targetUser.getEmail()
            )) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "message",
                                "You can share resources only with accepted connections."
                        ));
            }

            Map uploadResult =
                    cloudinaryService.uploadFile(file);

            String fileUrl =
                    String.valueOf(uploadResult.get("secure_url"));

            String publicId =
                    String.valueOf(uploadResult.get("public_id"));

            String resourceType =
                    String.valueOf(uploadResult.get("resource_type"));

            Document document = new Document();

            document.setFileName(file.getOriginalFilename());
            document.setFileType(file.getContentType());
            document.setFileSize(file.getSize());
            document.setStorageKey(publicId);
            document.setFileUrl(fileUrl);
            document.setResourceType(resourceType);
            document.setUploadedBy(currentUser.getId());
            document.setConnectionUserId(targetUser.getId());

            Document savedDocument =
                    documentRepository.save(document);

            return ResponseEntity.ok(savedDocument);

        } catch (IOException e) {

            return ResponseEntity.status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(Map.of(
                            "message",
                            "File upload failed.",
                            "error",
                            e.getMessage()
                    ));
        }
    }

    @GetMapping("/my-resources")
    public ResponseEntity<?> getMyResources(
            Authentication authentication
    ) {

        String currentEmail = authentication.getName();

        Optional<User> userOptional =
                userRepository.findByEmail(currentEmail);

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "User not found."
                    ));
        }

        User user = userOptional.get();

        return ResponseEntity.ok(
                documentRepository
                        .findByConnectionUserIdOrderByUploadedAtDesc(
                                user.getId()
                        )
        );
    }

    @GetMapping("/uploaded-by-me")
    public ResponseEntity<?> getUploadedByMe(
            Authentication authentication
    ) {

        String currentEmail = authentication.getName();

        Optional<User> userOptional =
                userRepository.findByEmail(currentEmail);

        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "User not found."
                    ));
        }

        User user = userOptional.get();

        return ResponseEntity.ok(
                documentRepository
                        .findByUploadedByOrderByUploadedAtDesc(
                                user.getId()
                        )
        );
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<?> downloadDocument(
            @PathVariable Long id,
            Authentication authentication
    ) {

        Optional<Document> documentOptional =
                documentRepository.findById(id);

        if (documentOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Document document = documentOptional.get();

        String currentEmail = authentication.getName();

        Optional<User> currentUserOptional =
                userRepository.findByEmail(currentEmail);

        if (currentUserOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "User not found."
                    ));
        }

        Long currentUserId =
                currentUserOptional.get().getId();

        boolean isUploader =
                currentUserId.equals(document.getUploadedBy());

        boolean isReceiver =
                currentUserId.equals(document.getConnectionUserId());

        if (!isUploader && !isReceiver) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "You are not authorized to access this file."
                    ));
        }

        HttpHeaders headers = new HttpHeaders();

        headers.setLocation(
                URI.create(document.getFileUrl())
        );

        return new ResponseEntity<>(
                headers,
                HttpStatus.FOUND
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDocument(
            @PathVariable Long id,
            Authentication authentication
    ) {

        Optional<Document> documentOptional =
                documentRepository.findById(id);

        if (documentOptional.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        Document document = documentOptional.get();

        String currentEmail = authentication.getName();

        Optional<User> currentUserOptional =
                userRepository.findByEmail(currentEmail);

        if (currentUserOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message",
                            "User not found."
                    ));
        }

        Long currentUserId =
                currentUserOptional.get().getId();

        if (!currentUserId.equals(document.getUploadedBy())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message",
                            "Only the uploader can delete this file."
                    ));
        }

        try {

            cloudinaryService.deleteFile(
                    document.getStorageKey(),
                    document.getResourceType()
            );

            documentRepository.delete(document);

            return ResponseEntity.ok(
                    Map.of(
                            "message",
                            "Resource deleted successfully."
                    )
            );

        } catch (IOException e) {

            return ResponseEntity.status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(Map.of(
                            "message",
                            "Failed to delete file.",
                            "error",
                            e.getMessage()
                    ));
        }
    }

    private boolean isAcceptedConnection(
            String email1,
            String email2
    ) {

        Optional<SwapRequest> firstDirection =
                swapRequestRepository
                        .findByRequesterEmailAndReceiverEmailAndStatusIn(
                                email1,
                                email2,
                                List.of("ACCEPTED")
                        );

        if (firstDirection.isPresent()) {
            return true;
        }

        Optional<SwapRequest> reverseDirection =
                swapRequestRepository
                        .findByRequesterEmailAndReceiverEmailAndStatusIn(
                                email2,
                                email1,
                                List.of("ACCEPTED")
                        );

        return reverseDirection.isPresent();
    }
}