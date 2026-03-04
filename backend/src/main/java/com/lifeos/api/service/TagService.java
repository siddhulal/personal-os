package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.DuplicateResourceException;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.TagRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TagService {

    private final TagRepository tagRepository;

    public List<TagResponse> getAllTags() {
        UUID userId = getCurrentUserId();
        List<Tag> tags = tagRepository.findByUserIdAndDeletedAtIsNull(userId);
        return tags.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public TagResponse getTag(UUID id) {
        Tag tag = findTagByIdAndUser(id);
        return mapToResponse(tag);
    }

    @Transactional
    public TagResponse createTag(TagRequest request) {
        User user = getCurrentUser();
        UUID userId = user.getId();

        if (tagRepository.existsByNameAndUserId(request.getName(), userId)) {
            throw new DuplicateResourceException("Tag", "name", request.getName());
        }

        Tag tag = new Tag();
        tag.setName(request.getName());
        tag.setColor(request.getColor());
        tag.setUser(user);

        tag = tagRepository.save(tag);
        return mapToResponse(tag);
    }

    @Transactional
    public TagResponse updateTag(UUID id, TagRequest request) {
        Tag tag = findTagByIdAndUser(id);
        UUID userId = getCurrentUserId();

        if (!tag.getName().equals(request.getName()) && tagRepository.existsByNameAndUserId(request.getName(), userId)) {
            throw new DuplicateResourceException("Tag", "name", request.getName());
        }

        tag.setName(request.getName());
        tag.setColor(request.getColor());

        tag = tagRepository.save(tag);
        return mapToResponse(tag);
    }

    @Transactional
    public void deleteTag(UUID id) {
        Tag tag = findTagByIdAndUser(id);
        tag.softDelete();
        tagRepository.save(tag);
    }

    private Tag findTagByIdAndUser(UUID id) {
        Tag tag = tagRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Tag", "id", id));
        if (!tag.getUser().getId().equals(getCurrentUserId()) || tag.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Tag", "id", id);
        }
        return tag;
    }

    private TagResponse mapToResponse(Tag tag) {
        return TagResponse.builder()
            .id(tag.getId())
            .name(tag.getName())
            .color(tag.getColor())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
