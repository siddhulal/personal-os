package com.lifeos.api.repository;

import com.lifeos.api.entity.LearningRoadmap;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LearningRoadmapRepository extends JpaRepository<LearningRoadmap, UUID> {

    Page<LearningRoadmap> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);
}
