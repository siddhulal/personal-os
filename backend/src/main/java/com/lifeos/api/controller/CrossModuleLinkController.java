package com.lifeos.api.controller;

import com.lifeos.api.dto.CrossModuleLinkRequest;
import com.lifeos.api.dto.CrossModuleLinkResponse;
import com.lifeos.api.service.CrossModuleLinkService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/connections")
@RequiredArgsConstructor
public class CrossModuleLinkController {

    private final CrossModuleLinkService crossModuleLinkService;

    @GetMapping("/{entityType}/{entityId}")
    public ResponseEntity<List<CrossModuleLinkResponse>> getLinksForEntity(
            @PathVariable String entityType,
            @PathVariable UUID entityId) {
        return ResponseEntity.ok(crossModuleLinkService.getLinksForEntity(entityType, entityId));
    }

    @GetMapping
    public ResponseEntity<List<CrossModuleLinkResponse>> getAllLinks() {
        return ResponseEntity.ok(crossModuleLinkService.getAllLinks());
    }

    @PostMapping
    public ResponseEntity<CrossModuleLinkResponse> createLink(@Valid @RequestBody CrossModuleLinkRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(crossModuleLinkService.createLink(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLink(@PathVariable UUID id) {
        crossModuleLinkService.deleteLink(id);
        return ResponseEntity.noContent().build();
    }
}
