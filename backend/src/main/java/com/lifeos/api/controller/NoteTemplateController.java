package com.lifeos.api.controller;

import com.lifeos.api.dto.NoteTemplateRequest;
import com.lifeos.api.dto.NoteTemplateResponse;
import com.lifeos.api.service.NoteTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/note-templates")
@RequiredArgsConstructor
public class NoteTemplateController {

    private final NoteTemplateService noteTemplateService;

    @GetMapping
    public ResponseEntity<List<NoteTemplateResponse>> listTemplates() {
        return ResponseEntity.ok(noteTemplateService.listTemplates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NoteTemplateResponse> getTemplate(@PathVariable UUID id) {
        return ResponseEntity.ok(noteTemplateService.getTemplate(id));
    }

    @PostMapping
    public ResponseEntity<NoteTemplateResponse> createTemplate(@Valid @RequestBody NoteTemplateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(noteTemplateService.createTemplate(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NoteTemplateResponse> updateTemplate(@PathVariable UUID id,
                                                                @Valid @RequestBody NoteTemplateRequest request) {
        return ResponseEntity.ok(noteTemplateService.updateTemplate(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTemplate(@PathVariable UUID id) {
        noteTemplateService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
