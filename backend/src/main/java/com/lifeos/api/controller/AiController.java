package com.lifeos.api.controller;

import com.lifeos.api.ai.AiProviderRegistry;
import com.lifeos.api.ai.provider.OllamaProvider;
import com.lifeos.api.dto.*;
import com.lifeos.api.service.AiChatService;
import com.lifeos.api.service.AiGenerateService;
import com.lifeos.api.service.AiSettingsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiSettingsService settingsService;
    private final AiChatService chatService;
    private final AiGenerateService generateService;
    private final AiProviderRegistry providerRegistry;

    // --- Settings ---

    @GetMapping("/settings")
    public ResponseEntity<AiSettingsResponse> getSettings() {
        return ResponseEntity.ok(settingsService.getSettings());
    }

    @PutMapping("/settings")
    public ResponseEntity<AiSettingsResponse> updateSettings(@RequestBody AiSettingsRequest request) {
        return ResponseEntity.ok(settingsService.updateSettings(request));
    }

    // --- Chat ---

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chat(@Valid @RequestBody AiChatRequest request) {
        return chatService.chat(request);
    }

    @GetMapping("/conversations")
    public ResponseEntity<PageResponse<AiConversationResponse>> getConversations(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(chatService.getConversations(pageable));
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<AiConversationResponse> getConversation(@PathVariable UUID id) {
        return ResponseEntity.ok(chatService.getConversation(id));
    }

    @DeleteMapping("/conversations/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable UUID id) {
        chatService.deleteConversation(id);
        return ResponseEntity.noContent().build();
    }

    // --- Generate ---

    @PostMapping("/generate/examples/{topicId}")
    public ResponseEntity<AiGenerateResponse> generateExamples(@PathVariable UUID topicId) {
        return ResponseEntity.ok(generateService.generateExamples(topicId));
    }

    @PostMapping("/generate/diagram/{topicId}")
    public ResponseEntity<AiGenerateResponse> generateDiagram(
            @PathVariable UUID topicId,
            @RequestBody(required = false) AiGenerateRequest request) {
        String diagramType = request != null ? request.getDiagramType() : "flowchart";
        return ResponseEntity.ok(generateService.generateDiagram(topicId, diagramType));
    }

    @PostMapping("/generate/interview-questions")
    public ResponseEntity<AiGenerateResponse> generateInterviewQuestions(@RequestBody AiGenerateRequest request) {
        return ResponseEntity.ok(generateService.generateInterviewQuestions(request));
    }

    @PostMapping("/generate/interview-answer/{questionId}")
    public ResponseEntity<AiGenerateResponse> generateInterviewAnswer(@PathVariable UUID questionId) {
        return ResponseEntity.ok(generateService.generateInterviewAnswer(questionId));
    }

    @PostMapping("/generate/improve-answer/{questionId}/{answerId}")
    public ResponseEntity<AiGenerateResponse> improveAnswer(
            @PathVariable UUID questionId,
            @PathVariable UUID answerId,
            @RequestBody(required = false) AiGenerateRequest request) {
        String action = request != null ? request.getAction() : "improve";
        return ResponseEntity.ok(generateService.improveAnswer(questionId, answerId, action));
    }

    @PostMapping("/generate/note-assist")
    public ResponseEntity<AiGenerateResponse> noteAssist(@Valid @RequestBody AiGenerateRequest request) {
        return ResponseEntity.ok(generateService.processNoteText(request));
    }

    // --- Provider Status ---

    @GetMapping("/providers/status")
    public ResponseEntity<Map<String, Boolean>> getProviderStatus() {
        Map<String, Boolean> status = new HashMap<>();
        for (String name : providerRegistry.getAvailableProviders()) {
            status.put(name, true);
        }
        return ResponseEntity.ok(status);
    }

    @GetMapping("/ollama/models")
    public ResponseEntity<java.util.List<String>> getOllamaModels() {
        try {
            OllamaProvider ollama = (OllamaProvider) providerRegistry.getProvider("OLLAMA");
            return ResponseEntity.ok(ollama.listModels());
        } catch (Exception e) {
            return ResponseEntity.ok(java.util.List.of());
        }
    }
}
