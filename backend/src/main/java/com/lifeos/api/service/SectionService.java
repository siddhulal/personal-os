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
public class SectionService {

    private final SectionRepository sectionRepository;
    private final NotebookRepository notebookRepository;
    private final NoteRepository noteRepository;

    public List<SectionResponse> getSectionsByNotebook(UUID notebookId) {
        // Verify notebook belongs to user
        Notebook notebook = notebookRepository.findById(notebookId)
            .orElseThrow(() -> new ResourceNotFoundException("Notebook", "id", notebookId));
        if (!notebook.getUser().getId().equals(getCurrentUserId()) || notebook.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Notebook", "id", notebookId);
        }

        List<Section> sections = sectionRepository.findByNotebookIdAndDeletedAtIsNullOrderByOrderIndexAsc(notebookId);
        return sections.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public SectionResponse createSection(UUID notebookId, SectionRequest request) {
        User user = getCurrentUser();
        Notebook notebook = notebookRepository.findById(notebookId)
            .orElseThrow(() -> new ResourceNotFoundException("Notebook", "id", notebookId));
        if (!notebook.getUser().getId().equals(user.getId()) || notebook.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Notebook", "id", notebookId);
        }

        List<Section> existing = sectionRepository.findByNotebookIdAndDeletedAtIsNullOrderByOrderIndexAsc(notebookId);

        Section section = new Section();
        section.setName(request.getName());
        section.setOrderIndex(existing.size());
        section.setNotebook(notebook);
        section.setUser(user);

        section = sectionRepository.save(section);
        return mapToResponse(section);
    }

    @Transactional
    public SectionResponse updateSection(UUID id, SectionRequest request) {
        Section section = findSectionByIdAndUser(id);
        section.setName(request.getName());
        section = sectionRepository.save(section);
        return mapToResponse(section);
    }

    @Transactional
    public void deleteSection(UUID id) {
        Section section = findSectionByIdAndUser(id);
        // Soft delete all notes in this section
        List<Note> notes = noteRepository.findBySectionIdAndDeletedAtIsNullOrderByOrderIndexAsc(section.getId());
        for (Note note : notes) {
            note.softDelete();
            noteRepository.save(note);
        }
        section.softDelete();
        sectionRepository.save(section);
    }

    public List<NoteResponse> getPagesBySection(UUID sectionId) {
        Section section = findSectionByIdAndUser(sectionId);
        List<Note> notes = noteRepository.findBySectionIdAndDeletedAtIsNullOrderByOrderIndexAsc(section.getId());
        return notes.stream().map(this::mapNoteToResponse).collect(Collectors.toList());
    }

    private Section findSectionByIdAndUser(UUID id) {
        Section section = sectionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Section", "id", id));
        if (!section.getUser().getId().equals(getCurrentUserId()) || section.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Section", "id", id);
        }
        return section;
    }

    private SectionResponse mapToResponse(Section section) {
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

    private NoteResponse mapNoteToResponse(Note note) {
        return NoteResponse.builder()
            .id(note.getId())
            .title(note.getTitle())
            .content(note.getContent())
            .contentJson(note.getContentJson())
            .orderIndex(note.getOrderIndex())
            .notebookId(note.getNotebook() != null ? note.getNotebook().getId() : null)
            .sectionId(note.getSection() != null ? note.getSection().getId() : null)
            .tags(note.getTags() != null ? note.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .createdAt(note.getCreatedAt())
            .updatedAt(note.getUpdatedAt())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
