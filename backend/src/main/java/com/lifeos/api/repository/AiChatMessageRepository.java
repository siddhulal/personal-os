package com.lifeos.api.repository;

import com.lifeos.api.entity.AiChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AiChatMessageRepository extends JpaRepository<AiChatMessage, UUID> {

    List<AiChatMessage> findByConversationIdOrderByCreatedAtAsc(UUID conversationId);
}
