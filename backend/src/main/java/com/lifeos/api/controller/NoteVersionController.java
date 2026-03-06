package com.lifeos.api.controller;

import com.lifeos.api.dto.NoteVersionResponse;
import com.lifeos.api.service.NoteVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notes/{noteId}/versions")
@RequiredArgsConstructor
public class NoteVersionController {

    private final NoteVersionService noteVersionService;

    @GetMapping
    public ResponseEntity<List<NoteVersionResponse>> getVersions(@PathVariable UUID noteId) {
        return ResponseEntity.ok(noteVersionService.getVersions(noteId));
    }

    @GetMapping("/{versionId}")
    public ResponseEntity<NoteVersionResponse> getVersion(@PathVariable UUID versionId) {
        return ResponseEntity.ok(noteVersionService.getVersion(versionId));
    }

    @PostMapping
    public ResponseEntity<NoteVersionResponse> createVersion(@PathVariable UUID noteId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteVersionService.createVersion(noteId));
    }

    @PostMapping("/{versionId}/restore")
    public ResponseEntity<NoteVersionResponse> restoreVersion(@PathVariable UUID versionId) {
        return ResponseEntity.ok(noteVersionService.restoreVersion(versionId));
    }
}
