package com.lifeos.api.service;

import com.lifeos.api.dto.NoteTemplateRequest;
import com.lifeos.api.dto.NoteTemplateResponse;
import com.lifeos.api.entity.NoteTemplate;
import com.lifeos.api.entity.User;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.NoteTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoteTemplateService {

    private final NoteTemplateRepository noteTemplateRepository;

    public List<NoteTemplateResponse> listTemplates() {
        UUID userId = getCurrentUserId();
        List<NoteTemplate> templates = noteTemplateRepository.findByUserIdOrderByNameAsc(userId);
        return templates.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public NoteTemplateResponse getTemplate(UUID id) {
        NoteTemplate template = findByIdAndUser(id);
        return mapToResponse(template);
    }

    @Transactional
    public NoteTemplateResponse createTemplate(NoteTemplateRequest request) {
        User user = getCurrentUser();
        NoteTemplate template = new NoteTemplate();
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setContent(request.getContent());
        template.setContentJson(request.getContentJson());
        template.setCategory(request.getCategory());
        template.setIcon(request.getIcon());
        template.setUser(user);

        template = noteTemplateRepository.save(template);
        return mapToResponse(template);
    }

    @Transactional
    public NoteTemplateResponse updateTemplate(UUID id, NoteTemplateRequest request) {
        NoteTemplate template = findByIdAndUser(id);
        template.setName(request.getName());
        template.setDescription(request.getDescription());
        template.setContent(request.getContent());
        template.setContentJson(request.getContentJson());
        template.setCategory(request.getCategory());
        template.setIcon(request.getIcon());

        template = noteTemplateRepository.save(template);
        return mapToResponse(template);
    }

    @Transactional
    public void deleteTemplate(UUID id) {
        NoteTemplate template = findByIdAndUser(id);
        noteTemplateRepository.delete(template);
    }

    // ==================== Private Helpers ====================

    private NoteTemplate findByIdAndUser(UUID id) {
        NoteTemplate template = noteTemplateRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("NoteTemplate", "id", id));
        if (!template.getUser().getId().equals(getCurrentUserId())) {
            throw new ResourceNotFoundException("NoteTemplate", "id", id);
        }
        return template;
    }

    private NoteTemplateResponse mapToResponse(NoteTemplate template) {
        return NoteTemplateResponse.builder()
            .id(template.getId())
            .name(template.getName())
            .description(template.getDescription())
            .content(template.getContent())
            .contentJson(template.getContentJson())
            .category(template.getCategory())
            .icon(template.getIcon())
            .createdAt(template.getCreatedAt())
            .updatedAt(template.getUpdatedAt())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
