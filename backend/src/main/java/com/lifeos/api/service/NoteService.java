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

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoteService {

    private final NoteRepository noteRepository;
    private final NoteLinkRepository noteLinkRepository;
    private final ProjectRepository projectRepository;
    private final NotebookRepository notebookRepository;
    private final SectionRepository sectionRepository;
    private final TagRepository tagRepository;

    public PageResponse<NoteResponse> getAllNotes(Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<Note> page = noteRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        return toPageResponse(page);
    }

    public NoteResponse getNote(UUID id) {
        Note note = findNoteByIdAndUser(id);
        return mapToResponse(note);
    }

    @Transactional
    public NoteResponse createNote(NoteRequest request) {
        User user = getCurrentUser();
        Note note = new Note();
        note.setTitle(request.getTitle());
        note.setContent(request.getContent());
        note.setContentJson(request.getContentJson());
        note.setUser(user);

        if (request.getOrderIndex() != null) {
            note.setOrderIndex(request.getOrderIndex());
        }

        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", request.getProjectId()));
            note.setProject(project);
        }

        if (request.getNotebookId() != null) {
            Notebook notebook = notebookRepository.findById(request.getNotebookId())
                .orElseThrow(() -> new ResourceNotFoundException("Notebook", "id", request.getNotebookId()));
            note.setNotebook(notebook);
        }

        if (request.getSectionId() != null) {
            Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section", "id", request.getSectionId()));
            note.setSection(section);
        }

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), user.getId()));
            note.setTags(tags);
        }

        note = noteRepository.save(note);
        return mapToResponse(note);
    }

    @Transactional
    public NoteResponse updateNote(UUID id, NoteRequest request) {
        Note note = findNoteByIdAndUser(id);
        note.setTitle(request.getTitle());
        note.setContent(request.getContent());
        note.setContentJson(request.getContentJson());

        if (request.getOrderIndex() != null) {
            note.setOrderIndex(request.getOrderIndex());
        }

        if (request.getProjectId() != null) {
            Project project = projectRepository.findById(request.getProjectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project", "id", request.getProjectId()));
            note.setProject(project);
        } else {
            note.setProject(null);
        }

        if (request.getNotebookId() != null) {
            Notebook notebook = notebookRepository.findById(request.getNotebookId())
                .orElseThrow(() -> new ResourceNotFoundException("Notebook", "id", request.getNotebookId()));
            note.setNotebook(notebook);
        }

        if (request.getSectionId() != null) {
            Section section = sectionRepository.findById(request.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Section", "id", request.getSectionId()));
            note.setSection(section);
        }

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), getCurrentUserId()));
            note.setTags(tags);
        }

        note = noteRepository.save(note);
        return mapToResponse(note);
    }

    @Transactional
    public void deleteNote(UUID id) {
        Note note = findNoteByIdAndUser(id);
        note.softDelete();
        noteRepository.save(note);
    }

    public List<NoteResponse> searchNotes(String query) {
        UUID userId = getCurrentUserId();
        List<Note> notes = noteRepository.search(userId, query);
        return notes.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    // ==================== Daily Notes ====================

    @Transactional
    public NoteResponse getOrCreateDailyNote(LocalDate date) {
        UUID userId = getCurrentUserId();
        Optional<Note> existing = noteRepository.findByUserIdAndDailyNoteDateAndDeletedAtIsNull(userId, date);
        if (existing.isPresent()) {
            return mapToResponse(existing.get());
        }
        User user = getCurrentUser();
        Note note = new Note();
        note.setTitle("Daily Note - " + date.format(DateTimeFormatter.ofPattern("MMM dd, yyyy")));
        note.setContent("");
        note.setDailyNote(true);
        note.setDailyNoteDate(date);
        note.setUser(user);
        note = noteRepository.save(note);
        return mapToResponse(note);
    }

    // ==================== Note Links ====================

    @Transactional
    public NoteLinkResponse createLink(UUID sourceId, UUID targetId) {
        UUID userId = getCurrentUserId();
        Note source = findNoteByIdAndUser(sourceId);
        Note target = findNoteByIdAndUser(targetId);

        Optional<NoteLink> existing = noteLinkRepository.findBySourceNoteIdAndTargetNoteIdAndUserId(sourceId, targetId, userId);
        if (existing.isPresent()) {
            return mapLinkToResponse(existing.get());
        }

        NoteLink link = NoteLink.builder()
            .sourceNote(source)
            .targetNote(target)
            .user(getCurrentUser())
            .build();
        link = noteLinkRepository.save(link);
        return mapLinkToResponse(link);
    }

    @Transactional
    public void deleteLink(UUID sourceId, UUID targetId) {
        UUID userId = getCurrentUserId();
        noteLinkRepository.deleteBySourceNoteIdAndTargetNoteIdAndUserId(sourceId, targetId, userId);
    }

    public List<NoteLinkResponse> getBacklinks(UUID noteId) {
        UUID userId = getCurrentUserId();
        findNoteByIdAndUser(noteId); // authorization check
        List<NoteLink> links = noteLinkRepository.findByTargetNoteIdAndUserId(noteId, userId);
        return links.stream().map(this::mapLinkToResponse).collect(Collectors.toList());
    }

    public NoteGraphResponse getGraph() {
        UUID userId = getCurrentUserId();
        List<NoteLink> links = noteLinkRepository.findByUserId(userId);

        Set<UUID> nodeIds = new HashSet<>();
        List<NoteGraphResponse.GraphEdge> edges = new ArrayList<>();

        for (NoteLink link : links) {
            nodeIds.add(link.getSourceNote().getId());
            nodeIds.add(link.getTargetNote().getId());
            edges.add(NoteGraphResponse.GraphEdge.builder()
                .sourceId(link.getSourceNote().getId())
                .targetId(link.getTargetNote().getId())
                .build());
        }

        List<NoteGraphResponse.GraphNode> nodes = nodeIds.stream()
            .map(id -> {
                Note note = noteRepository.findById(id).orElse(null);
                if (note == null || note.isDeleted()) return null;
                return NoteGraphResponse.GraphNode.builder()
                    .id(note.getId())
                    .title(note.getTitle())
                    .build();
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());

        return NoteGraphResponse.builder().nodes(nodes).edges(edges).build();
    }

    public List<NoteSuggestionResponse> suggestNotes(String query) {
        UUID userId = getCurrentUserId();
        List<Note> notes = noteRepository.suggestByTitle(userId, query);
        return notes.stream()
            .limit(10)
            .map(n -> NoteSuggestionResponse.builder().id(n.getId()).title(n.getTitle()).build())
            .collect(Collectors.toList());
    }

    // ==================== Private Helpers ====================

    private NoteLinkResponse mapLinkToResponse(NoteLink link) {
        return NoteLinkResponse.builder()
            .id(link.getId())
            .sourceNoteId(link.getSourceNote().getId())
            .sourceNoteTitle(link.getSourceNote().getTitle())
            .targetNoteId(link.getTargetNote().getId())
            .targetNoteTitle(link.getTargetNote().getTitle())
            .build();
    }

    private Note findNoteByIdAndUser(UUID id) {
        Note note = noteRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Note", "id", id));
        if (!note.getUser().getId().equals(getCurrentUserId()) || note.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Note", "id", id);
        }
        return note;
    }

    private NoteResponse mapToResponse(Note note) {
        return NoteResponse.builder()
            .id(note.getId())
            .title(note.getTitle())
            .content(note.getContent())
            .contentJson(note.getContentJson())
            .orderIndex(note.getOrderIndex())
            .projectId(note.getProject() != null ? note.getProject().getId() : null)
            .projectName(note.getProject() != null ? note.getProject().getName() : null)
            .notebookId(note.getNotebook() != null ? note.getNotebook().getId() : null)
            .sectionId(note.getSection() != null ? note.getSection().getId() : null)
            .isDailyNote(note.isDailyNote())
            .dailyNoteDate(note.getDailyNoteDate())
            .tags(note.getTags() != null ? note.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .createdAt(note.getCreatedAt())
            .updatedAt(note.getUpdatedAt())
            .build();
    }

    private PageResponse<NoteResponse> toPageResponse(Page<Note> page) {
        return PageResponse.<NoteResponse>builder()
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
