package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LearningService {

    private final LearningRoadmapRepository roadmapRepository;
    private final LearningTopicRepository topicRepository;

    // --- Roadmap CRUD ---

    public PageResponse<RoadmapResponse> getAllRoadmaps(Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<LearningRoadmap> page = roadmapRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        return toPageResponse(page);
    }

    public RoadmapResponse getRoadmap(UUID id) {
        LearningRoadmap roadmap = findRoadmapByIdAndUser(id);
        return mapToRoadmapResponse(roadmap);
    }

    @Transactional
    public RoadmapResponse createRoadmap(RoadmapRequest request) {
        User user = getCurrentUser();
        LearningRoadmap roadmap = new LearningRoadmap();
        roadmap.setTitle(request.getTitle());
        roadmap.setDescription(request.getDescription());
        roadmap.setUser(user);

        roadmap = roadmapRepository.save(roadmap);
        return mapToRoadmapResponse(roadmap);
    }

    @Transactional
    public RoadmapResponse updateRoadmap(UUID id, RoadmapRequest request) {
        LearningRoadmap roadmap = findRoadmapByIdAndUser(id);
        roadmap.setTitle(request.getTitle());
        roadmap.setDescription(request.getDescription());

        roadmap = roadmapRepository.save(roadmap);
        return mapToRoadmapResponse(roadmap);
    }

    @Transactional
    public void deleteRoadmap(UUID id) {
        LearningRoadmap roadmap = findRoadmapByIdAndUser(id);
        roadmap.softDelete();
        roadmapRepository.save(roadmap);
    }

    // --- Topic CRUD ---

    @Transactional
    public TopicResponse addTopic(UUID roadmapId, TopicRequest request) {
        LearningRoadmap roadmap = findRoadmapByIdAndUser(roadmapId);

        LearningTopic topic = new LearningTopic();
        topic.setTitle(request.getTitle());
        topic.setDescription(request.getDescription());
        topic.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        topic.setStatus(request.getStatus() != null ? LearningTopic.Status.valueOf(request.getStatus()) : LearningTopic.Status.NOT_STARTED);
        topic.setNotes(request.getNotes());
        topic.setRoadmap(roadmap);

        if (request.getParentTopicId() != null) {
            LearningTopic parentTopic = topicRepository.findById(request.getParentTopicId())
                .orElseThrow(() -> new ResourceNotFoundException("LearningTopic", "id", request.getParentTopicId()));
            topic.setParentTopic(parentTopic);
        }

        topic = topicRepository.save(topic);
        return mapToTopicResponse(topic);
    }

    @Transactional
    public TopicResponse updateTopic(UUID topicId, TopicRequest request) {
        LearningTopic topic = topicRepository.findById(topicId)
            .orElseThrow(() -> new ResourceNotFoundException("LearningTopic", "id", topicId));

        // Verify user owns the roadmap
        findRoadmapByIdAndUser(topic.getRoadmap().getId());

        if (topic.getDeletedAt() != null) {
            throw new ResourceNotFoundException("LearningTopic", "id", topicId);
        }

        topic.setTitle(request.getTitle());
        topic.setDescription(request.getDescription());
        if (request.getOrderIndex() != null) topic.setOrderIndex(request.getOrderIndex());
        if (request.getStatus() != null) topic.setStatus(LearningTopic.Status.valueOf(request.getStatus()));
        topic.setNotes(request.getNotes());

        if (request.getParentTopicId() != null) {
            LearningTopic parentTopic = topicRepository.findById(request.getParentTopicId())
                .orElseThrow(() -> new ResourceNotFoundException("LearningTopic", "id", request.getParentTopicId()));
            topic.setParentTopic(parentTopic);
        } else {
            topic.setParentTopic(null);
        }

        topic = topicRepository.save(topic);
        return mapToTopicResponse(topic);
    }

    @Transactional
    public void deleteTopic(UUID topicId) {
        LearningTopic topic = topicRepository.findById(topicId)
            .orElseThrow(() -> new ResourceNotFoundException("LearningTopic", "id", topicId));

        // Verify user owns the roadmap
        findRoadmapByIdAndUser(topic.getRoadmap().getId());

        if (topic.getDeletedAt() != null) {
            throw new ResourceNotFoundException("LearningTopic", "id", topicId);
        }

        topic.softDelete();
        topicRepository.save(topic);
    }

    // --- Private helpers ---

    private LearningRoadmap findRoadmapByIdAndUser(UUID id) {
        LearningRoadmap roadmap = roadmapRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("LearningRoadmap", "id", id));
        if (!roadmap.getUser().getId().equals(getCurrentUserId()) || roadmap.getDeletedAt() != null) {
            throw new ResourceNotFoundException("LearningRoadmap", "id", id);
        }
        return roadmap;
    }

    private RoadmapResponse mapToRoadmapResponse(LearningRoadmap roadmap) {
        int totalTopics = topicRepository.countByRoadmapIdAndDeletedAtIsNull(roadmap.getId());
        int completedTopics = topicRepository.countByRoadmapIdAndStatusAndDeletedAtIsNull(
            roadmap.getId(), LearningTopic.Status.COMPLETED);
        double progressPercentage = totalTopics > 0 ? (double) completedTopics / totalTopics * 100 : 0;

        // Build hierarchical topic list - only root topics (no parent)
        List<LearningTopic> rootTopics = topicRepository.findByRoadmapIdAndParentTopicIsNullAndDeletedAtIsNull(roadmap.getId());
        List<TopicResponse> topicResponses = rootTopics.stream()
            .map(this::mapToTopicResponseWithSubtopics)
            .collect(Collectors.toList());

        return RoadmapResponse.builder()
            .id(roadmap.getId())
            .title(roadmap.getTitle())
            .description(roadmap.getDescription())
            .topics(topicResponses)
            .totalTopics(totalTopics)
            .completedTopics(completedTopics)
            .progressPercentage(progressPercentage)
            .createdAt(roadmap.getCreatedAt())
            .updatedAt(roadmap.getUpdatedAt())
            .build();
    }

    private TopicResponse mapToTopicResponseWithSubtopics(LearningTopic topic) {
        List<TopicResponse> subtopicResponses = List.of();
        if (topic.getSubtopics() != null && !topic.getSubtopics().isEmpty()) {
            subtopicResponses = topic.getSubtopics().stream()
                .filter(st -> st.getDeletedAt() == null)
                .map(this::mapToTopicResponseWithSubtopics)
                .collect(Collectors.toList());
        }

        return TopicResponse.builder()
            .id(topic.getId())
            .title(topic.getTitle())
            .description(topic.getDescription())
            .orderIndex(topic.getOrderIndex())
            .status(topic.getStatus().name())
            .notes(topic.getNotes())
            .parentTopicId(topic.getParentTopic() != null ? topic.getParentTopic().getId() : null)
            .subtopics(subtopicResponses)
            .createdAt(topic.getCreatedAt())
            .updatedAt(topic.getUpdatedAt())
            .build();
    }

    private TopicResponse mapToTopicResponse(LearningTopic topic) {
        return TopicResponse.builder()
            .id(topic.getId())
            .title(topic.getTitle())
            .description(topic.getDescription())
            .orderIndex(topic.getOrderIndex())
            .status(topic.getStatus().name())
            .notes(topic.getNotes())
            .parentTopicId(topic.getParentTopic() != null ? topic.getParentTopic().getId() : null)
            .subtopics(List.of())
            .createdAt(topic.getCreatedAt())
            .updatedAt(topic.getUpdatedAt())
            .build();
    }

    private PageResponse<RoadmapResponse> toPageResponse(Page<LearningRoadmap> page) {
        return PageResponse.<RoadmapResponse>builder()
            .content(page.getContent().stream().map(this::mapToRoadmapResponse).collect(Collectors.toList()))
            .page(page.getNumber())
            .size(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .last(page.isLast())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
