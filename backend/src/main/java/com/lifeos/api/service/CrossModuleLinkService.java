package com.lifeos.api.service;

import com.lifeos.api.dto.CrossModuleLinkRequest;
import com.lifeos.api.dto.CrossModuleLinkResponse;
import com.lifeos.api.entity.CrossModuleLink;
import com.lifeos.api.entity.User;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.CrossModuleLinkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CrossModuleLinkService {

    private final CrossModuleLinkRepository crossModuleLinkRepository;

    public List<CrossModuleLinkResponse> getLinksForEntity(String entityType, UUID entityId) {
        UUID userId = getCurrentUserId();
        List<CrossModuleLink> sourceLinks = crossModuleLinkRepository
            .findByUserIdAndSourceTypeAndSourceId(userId, entityType, entityId);
        List<CrossModuleLink> targetLinks = crossModuleLinkRepository
            .findByUserIdAndTargetTypeAndTargetId(userId, entityType, entityId);

        List<CrossModuleLink> allLinks = new ArrayList<>(sourceLinks);
        allLinks.addAll(targetLinks);

        return allLinks.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public CrossModuleLinkResponse createLink(CrossModuleLinkRequest request) {
        User user = getCurrentUser();
        CrossModuleLink link = new CrossModuleLink();
        link.setSourceType(request.getSourceType());
        link.setSourceId(request.getSourceId());
        link.setTargetType(request.getTargetType());
        link.setTargetId(request.getTargetId());
        link.setLinkType(request.getLinkType());
        link.setUser(user);

        link = crossModuleLinkRepository.save(link);
        return mapToResponse(link);
    }

    @Transactional
    public void deleteLink(UUID id) {
        CrossModuleLink link = crossModuleLinkRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("CrossModuleLink", "id", id));
        if (!link.getUser().getId().equals(getCurrentUserId())) {
            throw new ResourceNotFoundException("CrossModuleLink", "id", id);
        }
        crossModuleLinkRepository.delete(link);
    }

    public List<CrossModuleLinkResponse> getAllLinks() {
        UUID userId = getCurrentUserId();
        List<CrossModuleLink> links = crossModuleLinkRepository.findByUserId(userId);
        return links.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // ==================== Private Helpers ====================

    private CrossModuleLinkResponse mapToResponse(CrossModuleLink link) {
        return CrossModuleLinkResponse.builder()
            .id(link.getId())
            .sourceType(link.getSourceType())
            .sourceId(link.getSourceId())
            .sourceTitle(null)
            .targetType(link.getTargetType())
            .targetId(link.getTargetId())
            .targetTitle(null)
            .linkType(link.getLinkType())
            .createdAt(link.getCreatedAt())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
