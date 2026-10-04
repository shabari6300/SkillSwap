package com.skillswap.backend.repository;

import com.skillswap.backend.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findBySenderEmailAndReceiverEmailOrReceiverEmailAndSenderEmail(
            String senderEmail,
            String receiverEmail,
            String receiverEmail2,
            String senderEmail2
    );
}