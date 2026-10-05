package com.skillswap.backend.repository;

import com.skillswap.backend.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DocumentRepository
        extends JpaRepository<Document, Long> {

    List<Document> findByConnectionUserIdOrderByUploadedAtDesc(
            Long connectionUserId
    );

    List<Document> findByUploadedByOrderByUploadedAtDesc(
            Long uploadedBy
    );
}