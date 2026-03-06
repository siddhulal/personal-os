package com.lifeos.api.repository;

import com.lifeos.api.entity.Webhook;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface WebhookRepository extends JpaRepository<Webhook, UUID> {

    List<Webhook> findByUserIdOrderByCreatedAtDesc(UUID userId);

    List<Webhook> findByUserIdAndIsActiveTrue(UUID userId);
}
