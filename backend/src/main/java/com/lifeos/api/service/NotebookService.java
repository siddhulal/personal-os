package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotebookService {

    private final NotebookRepository notebookRepository;
    private final SectionRepository sectionRepository;
    private final NoteRepository noteRepository;

    public List<NotebookResponse> getAllNotebooks() {
        UUID userId = getCurrentUserId();
        List<Notebook> notebooks = notebookRepository.findByUserIdAndDeletedAtIsNullOrderByOrderIndexAsc(userId);
        return notebooks.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public NotebookResponse getNotebook(UUID id) {
        Notebook notebook = findNotebookByIdAndUser(id);
        return mapToResponse(notebook);
    }

    @Transactional
    public NotebookResponse createNotebook(NotebookRequest request) {
        User user = getCurrentUser();
        List<Notebook> existing = notebookRepository.findByUserIdAndDeletedAtIsNullOrderByOrderIndexAsc(user.getId());

        Notebook notebook = new Notebook();
        notebook.setName(request.getName());
        notebook.setDescription(request.getDescription());
        notebook.setColor(request.getColor() != null ? request.getColor() : "#6366f1");
        notebook.setIcon(request.getIcon() != null ? request.getIcon() : "notebook");
        notebook.setOrderIndex(existing.size());
        notebook.setUser(user);

        notebook = notebookRepository.save(notebook);

        // Create a default section
        Section section = new Section();
        section.setName("General");
        section.setOrderIndex(0);
        section.setNotebook(notebook);
        section.setUser(user);
        sectionRepository.save(section);

        return mapToResponse(notebookRepository.findById(notebook.getId()).orElse(notebook));
    }

    @Transactional
    public NotebookResponse updateNotebook(UUID id, NotebookRequest request) {
        Notebook notebook = findNotebookByIdAndUser(id);
        notebook.setName(request.getName());
        notebook.setDescription(request.getDescription());
        if (request.getColor() != null) {
            notebook.setColor(request.getColor());
        }
        if (request.getIcon() != null) {
            notebook.setIcon(request.getIcon());
        }

        notebook = notebookRepository.save(notebook);
        return mapToResponse(notebook);
    }

    @Transactional
    public void deleteNotebook(UUID id) {
        Notebook notebook = findNotebookByIdAndUser(id);
        notebook.softDelete();
        // Soft delete sections too
        List<Section> sections = sectionRepository.findByNotebookIdAndDeletedAtIsNullOrderByOrderIndexAsc(id);
        for (Section section : sections) {
            section.softDelete();
            sectionRepository.save(section);
        }
        notebookRepository.save(notebook);
    }

    private Notebook findNotebookByIdAndUser(UUID id) {
        Notebook notebook = notebookRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Notebook", "id", id));
        if (!notebook.getUser().getId().equals(getCurrentUserId()) || notebook.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Notebook", "id", id);
        }
        return notebook;
    }

    private NotebookResponse mapToResponse(Notebook notebook) {
        List<Section> sections = sectionRepository.findByNotebookIdAndDeletedAtIsNullOrderByOrderIndexAsc(notebook.getId());
        return NotebookResponse.builder()
            .id(notebook.getId())
            .name(notebook.getName())
            .description(notebook.getDescription())
            .color(notebook.getColor())
            .icon(notebook.getIcon())
            .orderIndex(notebook.getOrderIndex())
            .sections(sections.stream().map(this::mapSectionToResponse).collect(Collectors.toList()))
            .createdAt(notebook.getCreatedAt())
            .updatedAt(notebook.getUpdatedAt())
            .build();
    }

    private SectionResponse mapSectionToResponse(Section section) {
        return SectionResponse.builder()
            .id(section.getId())
            .name(section.getName())
            .orderIndex(section.getOrderIndex())
            .notebookId(section.getNotebook().getId())
            .pageCount(noteRepository.countBySectionIdAndDeletedAtIsNull(section.getId()))
            .createdAt(section.getCreatedAt())
            .updatedAt(section.getUpdatedAt())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
