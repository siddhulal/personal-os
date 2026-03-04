package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.IdeaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/ideas")
@RequiredArgsConstructor
public class IdeaController {

    private final IdeaService ideaService;

    @GetMapping
    public ResponseEntity<PageResponse<IdeaResponse>> getAllIdeas(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ideaService.getAllIdeas(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IdeaResponse> getIdea(@PathVariable UUID id) {
        return ResponseEntity.ok(ideaService.getIdea(id));
    }

    @PostMapping
    public ResponseEntity<IdeaResponse> createIdea(@Valid @RequestBody IdeaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ideaService.createIdea(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IdeaResponse> updateIdea(@PathVariable UUID id, @Valid @RequestBody IdeaRequest request) {
        return ResponseEntity.ok(ideaService.updateIdea(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIdea(@PathVariable UUID id) {
        ideaService.deleteIdea(id);
        return ResponseEntity.noContent().build();
    }
}
