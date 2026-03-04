package com.lifeos.api.repository;

import com.lifeos.api.entity.LearningTopic;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LearningTopicRepository extends JpaRepository<LearningTopic, UUID> {

    List<LearningTopic> findByRoadmapIdAndDeletedAtIsNull(UUID roadmapId);

    List<LearningTopic> findByRoadmapIdAndParentTopicIsNullAndDeletedAtIsNull(UUID roadmapId);

    int countByRoadmapIdAndDeletedAtIsNull(UUID roadmapId);

    int countByRoadmapIdAndStatusAndDeletedAtIsNull(UUID roadmapId, LearningTopic.Status status);
}
