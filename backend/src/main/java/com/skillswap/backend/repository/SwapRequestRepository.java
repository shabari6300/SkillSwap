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
}