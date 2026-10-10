
package com.skillswap.backend.repository;

import com.skillswap.backend.entity.SkillSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SkillSessionRepository
        extends JpaRepository<SkillSession, Long> {

    List<SkillSession>
    findByOrganizerEmailIgnoreCaseOrPartnerEmailIgnoreCaseOrderByScheduledAtAsc(
            String organizerEmail,
            String partnerEmail
    );
}
