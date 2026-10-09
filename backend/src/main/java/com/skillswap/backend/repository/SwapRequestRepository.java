
package com.skillswap.backend.repository;

import com.skillswap.backend.entity.SwapRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SwapRequestRepository extends JpaRepository<SwapRequest, Long> {

    List<SwapRequest> findByReceiverEmail(String receiverEmail);

    List<SwapRequest> findByRequesterEmail(String requesterEmail);

    Optional<SwapRequest> findByRequesterEmailAndReceiverEmailAndStatusIn(
            String requesterEmail,
            String receiverEmail,
            List<String> statuses
    );

    boolean existsByRequesterEmailIgnoreCaseAndReceiverEmailIgnoreCaseAndStatusIgnoreCase(
            String requesterEmail,
            String receiverEmail,
            String status
    );

    /*
     * A call is permitted only when an accepted swap request
     * exists in either direction between the two users.
     */
    default boolean existsAcceptedConnectionBetween(
            String firstEmail,
            String secondEmail
    ) {
        return existsByRequesterEmailIgnoreCaseAndReceiverEmailIgnoreCaseAndStatusIgnoreCase(
                firstEmail,
                secondEmail,
                "ACCEPTED"
        ) || existsByRequesterEmailIgnoreCaseAndReceiverEmailIgnoreCaseAndStatusIgnoreCase(
                secondEmail,
                firstEmail,
                "ACCEPTED"
        );
    }
}
