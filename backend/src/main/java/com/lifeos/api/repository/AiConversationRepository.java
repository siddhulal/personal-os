package com.lifeos.api.repository;

import com.lifeos.api.entity.AiConversation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AiConversationRepository extends JpaRepository<AiConversation, UUID> {

    Page<AiConversation> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    Optional<AiConversation> findByIdAndUserId(UUID id, UUID userId);
}
