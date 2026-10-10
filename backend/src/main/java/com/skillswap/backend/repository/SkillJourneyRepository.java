
package com.skillswap.backend.repository;

import com.skillswap.backend.entity.SkillJourney;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SkillJourneyRepository
        extends JpaRepository<SkillJourney, Long> {

    List<SkillJourney> findByUserEmailIgnoreCaseOrderByCreatedAtDesc(
            String userEmail
    );
}
