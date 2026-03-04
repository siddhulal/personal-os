package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.GoalRepository;
import com.lifeos.api.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GoalService {

    private final GoalRepository goalRepository;
    private final TagRepository tagRepository;

    public PageResponse<GoalResponse> getAllGoals(Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<Goal> page = goalRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        return toPageResponse(page);
    }

    public GoalResponse getGoal(UUID id) {
        Goal goal = findGoalByIdAndUser(id);
        return mapToResponse(goal);
    }

    @Transactional
    public GoalResponse createGoal(GoalRequest request) {
        User user = getCurrentUser();
        Goal goal = new Goal();
        goal.setTitle(request.getTitle());
        goal.setDescription(request.getDescription());
        goal.setTargetDate(request.getTargetDate());
        goal.setStatus(request.getStatus() != null ? Goal.Status.valueOf(request.getStatus()) : Goal.Status.NOT_STARTED);
        goal.setTimeframe(request.getTimeframe() != null ? Goal.Timeframe.valueOf(request.getTimeframe()) : Goal.Timeframe.MONTHLY);
        goal.setProgress(request.getProgress() != null ? request.getProgress() : 0);
        goal.setUser(user);

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), user.getId()));
            goal.setTags(tags);
        }

        goal = goalRepository.save(goal);
        return mapToResponse(goal);
    }

    @Transactional
    public GoalResponse updateGoal(UUID id, GoalRequest request) {
        Goal goal = findGoalByIdAndUser(id);
        goal.setTitle(request.getTitle());
        goal.setDescription(request.getDescription());
        goal.setTargetDate(request.getTargetDate());
        if (request.getStatus() != null) {
            goal.setStatus(Goal.Status.valueOf(request.getStatus()));
        }
        if (request.getTimeframe() != null) {
            goal.setTimeframe(Goal.Timeframe.valueOf(request.getTimeframe()));
        }
        if (request.getProgress() != null) {
            goal.setProgress(request.getProgress());
        }

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), getCurrentUserId()));
            goal.setTags(tags);
        }

        goal = goalRepository.save(goal);
        return mapToResponse(goal);
    }

    @Transactional
    public void deleteGoal(UUID id) {
        Goal goal = findGoalByIdAndUser(id);
        goal.softDelete();
        goalRepository.save(goal);
    }

    private Goal findGoalByIdAndUser(UUID id) {
        Goal goal = goalRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Goal", "id", id));
        if (!goal.getUser().getId().equals(getCurrentUserId()) || goal.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Goal", "id", id);
        }
        return goal;
    }

    private GoalResponse mapToResponse(Goal goal) {
        return GoalResponse.builder()
            .id(goal.getId())
            .title(goal.getTitle())
            .description(goal.getDescription())
            .targetDate(goal.getTargetDate())
            .status(goal.getStatus().name())
            .timeframe(goal.getTimeframe() != null ? goal.getTimeframe().name() : null)
            .progress(goal.getProgress())
            .tags(goal.getTags() != null ? goal.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .createdAt(goal.getCreatedAt())
            .updatedAt(goal.getUpdatedAt())
            .build();
    }

    private PageResponse<GoalResponse> toPageResponse(Page<Goal> page) {
        return PageResponse.<GoalResponse>builder()
            .content(page.getContent().stream().map(this::mapToResponse).collect(Collectors.toList()))
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
