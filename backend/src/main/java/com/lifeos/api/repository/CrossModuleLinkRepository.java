package com.lifeos.api.repository;

import com.lifeos.api.entity.CrossModuleLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CrossModuleLinkRepository extends JpaRepository<CrossModuleLink, UUID> {

    List<CrossModuleLink> findByUserIdAndSourceTypeAndSourceId(UUID userId, String sourceType, UUID sourceId);

    List<CrossModuleLink> findByUserIdAndTargetTypeAndTargetId(UUID userId, String targetType, UUID targetId);

    List<CrossModuleLink> findByUserId(UUID userId);
}
