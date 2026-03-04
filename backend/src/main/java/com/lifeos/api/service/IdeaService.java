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

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IdeaService {

    private final IdeaRepository ideaRepository;
    private final TagRepository tagRepository;

    public PageResponse<IdeaResponse> getAllIdeas(Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<Idea> page = ideaRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        return toPageResponse(page);
    }

    public IdeaResponse getIdea(UUID id) {
        Idea idea = findIdeaByIdAndUser(id);
        return mapToResponse(idea);
    }

    @Transactional
    public IdeaResponse createIdea(IdeaRequest request) {
        User user = getCurrentUser();
        Idea idea = new Idea();
        idea.setTitle(request.getTitle());
        idea.setDescription(request.getDescription());
        idea.setStatus(request.getStatus() != null ? Idea.Status.valueOf(request.getStatus()) : Idea.Status.CAPTURED);
        idea.setCategory(request.getCategory() != null ? Idea.Category.valueOf(request.getCategory()) : Idea.Category.OTHER);
        idea.setUser(user);

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), user.getId()));
            idea.setTags(tags);
        }

        idea = ideaRepository.save(idea);
        return mapToResponse(idea);
    }

    @Transactional
    public IdeaResponse updateIdea(UUID id, IdeaRequest request) {
        Idea idea = findIdeaByIdAndUser(id);
        idea.setTitle(request.getTitle());
        idea.setDescription(request.getDescription());
        if (request.getStatus() != null) {
            idea.setStatus(Idea.Status.valueOf(request.getStatus()));
        }
        if (request.getCategory() != null) {
            idea.setCategory(Idea.Category.valueOf(request.getCategory()));
        }

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), getCurrentUserId()));
            idea.setTags(tags);
        }

        idea = ideaRepository.save(idea);
        return mapToResponse(idea);
    }

    @Transactional
    public void deleteIdea(UUID id) {
        Idea idea = findIdeaByIdAndUser(id);
        idea.softDelete();
        ideaRepository.save(idea);
    }

    private Idea findIdeaByIdAndUser(UUID id) {
        Idea idea = ideaRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Idea", "id", id));
        if (!idea.getUser().getId().equals(getCurrentUserId()) || idea.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Idea", "id", id);
        }
        return idea;
    }

    private IdeaResponse mapToResponse(Idea idea) {
        return IdeaResponse.builder()
            .id(idea.getId())
            .title(idea.getTitle())
            .description(idea.getDescription())
            .status(idea.getStatus() != null ? idea.getStatus().name() : null)
            .category(idea.getCategory() != null ? idea.getCategory().name() : null)
            .tags(idea.getTags() != null ? idea.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .createdAt(idea.getCreatedAt())
            .updatedAt(idea.getUpdatedAt())
            .build();
    }

    private PageResponse<IdeaResponse> toPageResponse(Page<Idea> page) {
        return PageResponse.<IdeaResponse>builder()
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
