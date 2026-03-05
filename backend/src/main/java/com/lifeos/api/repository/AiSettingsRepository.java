package com.lifeos.api.repository;

import com.lifeos.api.entity.AiSettings;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AiSettingsRepository extends JpaRepository<AiSettings, UUID> {

    Optional<AiSettings> findByUserId(UUID userId);
}
