package com.lifeos.api.controller;

import com.lifeos.api.dto.CanvasEdgeRequest;
import com.lifeos.api.dto.CanvasEdgeResponse;
import com.lifeos.api.dto.CanvasNodeRequest;
import com.lifeos.api.dto.CanvasNodeResponse;
import com.lifeos.api.service.CanvasService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/canvas")
@RequiredArgsConstructor
public class CanvasController {

    private final CanvasService canvasService;

    @GetMapping("/nodes")
    public ResponseEntity<List<CanvasNodeResponse>> getNodes(
            @RequestParam(defaultValue = "default") String canvasId) {
        return ResponseEntity.ok(canvasService.getNodes(canvasId));
    }

    @GetMapping("/edges")
    public ResponseEntity<List<CanvasEdgeResponse>> getEdges(
            @RequestParam(defaultValue = "default") String canvasId) {
        return ResponseEntity.ok(canvasService.getEdges(canvasId));
    }

    @PostMapping("/nodes")
    public ResponseEntity<CanvasNodeResponse> createNode(@Valid @RequestBody CanvasNodeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(canvasService.createNode(request));
    }

    @PutMapping("/nodes/{id}")
    public ResponseEntity<CanvasNodeResponse> updateNode(@PathVariable UUID id,
                                                          @Valid @RequestBody CanvasNodeRequest request) {
        return ResponseEntity.ok(canvasService.updateNode(id, request));
    }

    @DeleteMapping("/nodes/{id}")
    public ResponseEntity<Void> deleteNode(@PathVariable UUID id) {
        canvasService.deleteNode(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/edges")
    public ResponseEntity<CanvasEdgeResponse> createEdge(@Valid @RequestBody CanvasEdgeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(canvasService.createEdge(request));
    }

    @DeleteMapping("/edges/{id}")
    public ResponseEntity<Void> deleteEdge(@PathVariable UUID id) {
        canvasService.deleteEdge(id);
        return ResponseEntity.noContent().build();
    }
}
