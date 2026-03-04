package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.SkillRepository;
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
public class SkillService {

    private final SkillRepository skillRepository;
    private final TagRepository tagRepository;

    public PageResponse<SkillResponse> getAllSkills(Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<Skill> page = skillRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        return toPageResponse(page);
    }

    public SkillResponse getSkill(UUID id) {
        Skill skill = findSkillByIdAndUser(id);
        return mapToResponse(skill);
    }

    @Transactional
    public SkillResponse createSkill(SkillRequest request) {
        User user = getCurrentUser();
        Skill skill = new Skill();
        skill.setName(request.getName());
        skill.setLevel(request.getLevel() != null ? Skill.Level.valueOf(request.getLevel()) : Skill.Level.BEGINNER);
        skill.setConfidenceScore(request.getConfidenceScore() != null ? request.getConfidenceScore() : 1);
        skill.setLastPracticed(request.getLastPracticed());
        skill.setCategory(request.getCategory());
        skill.setNotes(request.getNotes());
        skill.setUser(user);

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), user.getId()));
            skill.setTags(tags);
        }

        skill = skillRepository.save(skill);
        return mapToResponse(skill);
    }

    @Transactional
    public SkillResponse updateSkill(UUID id, SkillRequest request) {
        Skill skill = findSkillByIdAndUser(id);
        skill.setName(request.getName());
        if (request.getLevel() != null) {
            skill.setLevel(Skill.Level.valueOf(request.getLevel()));
        }
        if (request.getConfidenceScore() != null) {
            skill.setConfidenceScore(request.getConfidenceScore());
        }
        skill.setLastPracticed(request.getLastPracticed());
        skill.setCategory(request.getCategory());
        skill.setNotes(request.getNotes());

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), getCurrentUserId()));
            skill.setTags(tags);
        }

        skill = skillRepository.save(skill);
        return mapToResponse(skill);
    }

    @Transactional
    public void deleteSkill(UUID id) {
        Skill skill = findSkillByIdAndUser(id);
        skill.softDelete();
        skillRepository.save(skill);
    }

    private Skill findSkillByIdAndUser(UUID id) {
        Skill skill = skillRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Skill", "id", id));
        if (!skill.getUser().getId().equals(getCurrentUserId()) || skill.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Skill", "id", id);
        }
        return skill;
    }

    private SkillResponse mapToResponse(Skill skill) {
        return SkillResponse.builder()
            .id(skill.getId())
            .name(skill.getName())
            .level(skill.getLevel().name())
            .confidenceScore(skill.getConfidenceScore())
            .lastPracticed(skill.getLastPracticed())
            .category(skill.getCategory())
            .notes(skill.getNotes())
            .tags(skill.getTags() != null ? skill.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .createdAt(skill.getCreatedAt())
            .updatedAt(skill.getUpdatedAt())
            .build();
    }

    private PageResponse<SkillResponse> toPageResponse(Page<Skill> page) {
        return PageResponse.<SkillResponse>builder()
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
