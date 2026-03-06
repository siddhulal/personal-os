package com.lifeos.api.service;

import com.lifeos.api.dto.NoteVersionResponse;
import com.lifeos.api.entity.Note;
import com.lifeos.api.entity.NoteVersion;
import com.lifeos.api.entity.User;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.NoteRepository;
import com.lifeos.api.repository.NoteVersionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NoteVersionService {

    private final NoteVersionRepository noteVersionRepository;
    private final NoteRepository noteRepository;

    public List<NoteVersionResponse> getVersions(UUID noteId) {
        Note note = findNoteByIdAndUser(noteId);
        List<NoteVersion> versions = noteVersionRepository.findByNoteIdOrderByVersionNumberDesc(note.getId());
        return versions.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public NoteVersionResponse getVersion(UUID versionId) {
        NoteVersion version = noteVersionRepository.findById(versionId)
            .orElseThrow(() -> new ResourceNotFoundException("NoteVersion", "id", versionId));
        if (!version.getUser().getId().equals(getCurrentUserId())) {
            throw new ResourceNotFoundException("NoteVersion", "id", versionId);
        }
        return mapToResponse(version);
    }

    @Transactional
    public NoteVersionResponse createVersion(UUID noteId) {
        Note note = findNoteByIdAndUser(noteId);
        User user = getCurrentUser();

        int nextVersionNumber = noteVersionRepository.countByNoteId(noteId) + 1;

        NoteVersion version = new NoteVersion();
        version.setNote(note);
        version.setUser(user);
        version.setTitle(note.getTitle());
        version.setContent(note.getContent());
        version.setContentJson(note.getContentJson());
        version.setVersionNumber(nextVersionNumber);

        version = noteVersionRepository.save(version);
        return mapToResponse(version);
    }

    @Transactional
    public NoteVersionResponse restoreVersion(UUID versionId) {
        NoteVersion version = noteVersionRepository.findById(versionId)
            .orElseThrow(() -> new ResourceNotFoundException("NoteVersion", "id", versionId));
        if (!version.getUser().getId().equals(getCurrentUserId())) {
            throw new ResourceNotFoundException("NoteVersion", "id", versionId);
        }

        Note note = version.getNote();
        User user = getCurrentUser();

        // Create a snapshot of the current state before restoring
        int nextVersionNumber = noteVersionRepository.countByNoteId(note.getId()) + 1;
        NoteVersion snapshot = new NoteVersion();
        snapshot.setNote(note);
        snapshot.setUser(user);
        snapshot.setTitle(note.getTitle());
        snapshot.setContent(note.getContent());
        snapshot.setContentJson(note.getContentJson());
        snapshot.setVersionNumber(nextVersionNumber);
        noteVersionRepository.save(snapshot);

        // Restore the note to the selected version's content
        note.setTitle(version.getTitle());
        note.setContent(version.getContent());
        note.setContentJson(version.getContentJson());
        noteRepository.save(note);

        return mapToResponse(snapshot);
    }

    // ==================== Private Helpers ====================

    private Note findNoteByIdAndUser(UUID noteId) {
        Note note = noteRepository.findById(noteId)
            .orElseThrow(() -> new ResourceNotFoundException("Note", "id", noteId));
        if (!note.getUser().getId().equals(getCurrentUserId()) || note.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Note", "id", noteId);
        }
        return note;
    }

    private NoteVersionResponse mapToResponse(NoteVersion version) {
        return NoteVersionResponse.builder()
            .id(version.getId())
            .noteId(version.getNote().getId())
            .title(version.getTitle())
            .content(version.getContent())
            .contentJson(version.getContentJson())
            .versionNumber(version.getVersionNumber())
            .createdAt(version.getCreatedAt())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
