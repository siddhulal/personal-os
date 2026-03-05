package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.NotebookService;
import com.lifeos.api.service.SectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/notebooks")
@RequiredArgsConstructor
public class NotebookController {

    private final NotebookService notebookService;
    private final SectionService sectionService;

    @GetMapping
    public ResponseEntity<List<NotebookResponse>> getAllNotebooks() {
        return ResponseEntity.ok(notebookService.getAllNotebooks());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotebookResponse> getNotebook(@PathVariable UUID id) {
        return ResponseEntity.ok(notebookService.getNotebook(id));
    }

    @PostMapping
    public ResponseEntity<NotebookResponse> createNotebook(@Valid @RequestBody NotebookRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(notebookService.createNotebook(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotebookResponse> updateNotebook(@PathVariable UUID id, @Valid @RequestBody NotebookRequest request) {
        return ResponseEntity.ok(notebookService.updateNotebook(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotebook(@PathVariable UUID id) {
        notebookService.deleteNotebook(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/default")
    public ResponseEntity<NotebookResponse> getOrCreateDefaultNotebook(@RequestParam(defaultValue = "Learning Notes") String name) {
        return ResponseEntity.ok(notebookService.getOrCreateDefaultNotebook(name));
    }

    @GetMapping("/{id}/sections")
    public ResponseEntity<List<SectionResponse>> getSections(@PathVariable UUID id) {
        return ResponseEntity.ok(sectionService.getSectionsByNotebook(id));
    }

    @PostMapping("/{id}/sections")
    public ResponseEntity<SectionResponse> createSection(@PathVariable UUID id, @Valid @RequestBody SectionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sectionService.createSection(id, request));
    }
}
