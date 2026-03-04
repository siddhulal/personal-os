package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.SectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/sections")
@RequiredArgsConstructor
public class SectionController {

    private final SectionService sectionService;

    @PutMapping("/{id}")
    public ResponseEntity<SectionResponse> updateSection(@PathVariable UUID id, @Valid @RequestBody SectionRequest request) {
        return ResponseEntity.ok(sectionService.updateSection(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSection(@PathVariable UUID id) {
        sectionService.deleteSection(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/pages")
    public ResponseEntity<List<NoteResponse>> getPages(@PathVariable UUID id) {
        return ResponseEntity.ok(sectionService.getPagesBySection(id));
    }
}
