package com.skillswap.backend.repository;

import com.skillswap.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    List<User> findByTeachSkillAndLearnSkillAndEmailNot(
            String teachSkill,
            String learnSkill,
            String email
    );
}