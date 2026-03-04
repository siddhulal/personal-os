package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.NoteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notes")
@RequiredArgsConstructor
public class NoteController {

    private final NoteService noteService;

    @GetMapping
    public ResponseEntity<PageResponse<NoteResponse>> getAllNotes(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(noteService.getAllNotes(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoteResponse> getNote(@PathVariable UUID id) {
        return ResponseEntity.ok(noteService.getNote(id));
    }

    @PostMapping
    public ResponseEntity<NoteResponse> createNote(@Valid @RequestBody NoteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteService.createNote(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoteResponse> updateNote(@PathVariable UUID id, @Valid @RequestBody NoteRequest request) {
        return ResponseEntity.ok(noteService.updateNote(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable UUID id) {
        noteService.deleteNote(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<List<NoteResponse>> searchNotes(@RequestParam("q") String query) {
        return ResponseEntity.ok(noteService.searchNotes(query));
    }

    // ==================== Daily Notes ====================

    @PostMapping("/daily")
    public ResponseEntity<NoteResponse> getOrCreateDailyNote(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) date = LocalDate.now();
        return ResponseEntity.ok(noteService.getOrCreateDailyNote(date));
    }

    // ==================== Note Links ====================

    @PostMapping("/{id}/links")
    public ResponseEntity<NoteLinkResponse> createLink(
            @PathVariable UUID id,
            @RequestBody Map<String, UUID> body) {
        UUID targetId = body.get("targetNoteId");
        return ResponseEntity.status(HttpStatus.CREATED).body(noteService.createLink(id, targetId));
    }

    @DeleteMapping("/{sourceId}/links/{targetId}")
    public ResponseEntity<Void> deleteLink(@PathVariable UUID sourceId, @PathVariable UUID targetId) {
        noteService.deleteLink(sourceId, targetId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/backlinks")
    public ResponseEntity<List<NoteLinkResponse>> getBacklinks(@PathVariable UUID id) {
        return ResponseEntity.ok(noteService.getBacklinks(id));
    }

    // ==================== Knowledge Graph ====================

    @GetMapping("/graph")
    public ResponseEntity<NoteGraphResponse> getGraph() {
        return ResponseEntity.ok(noteService.getGraph());
    }

    // ==================== Suggestions ====================

    @GetMapping("/suggest")
    public ResponseEntity<List<NoteSuggestionResponse>> suggestNotes(@RequestParam("q") String query) {
        return ResponseEntity.ok(noteService.suggestNotes(query));
    }
}
