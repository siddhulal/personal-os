package com.lifeos.api.controller;

import com.lifeos.api.dto.WebhookRequest;
import com.lifeos.api.dto.WebhookResponse;
import com.lifeos.api.service.WebhookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final WebhookService webhookService;

    @GetMapping
    public ResponseEntity<List<WebhookResponse>> listWebhooks() {
        return ResponseEntity.ok(webhookService.listWebhooks());
    }

    @PostMapping
    public ResponseEntity<WebhookResponse> createWebhook(@Valid @RequestBody WebhookRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(webhookService.createWebhook(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<WebhookResponse> updateWebhook(@PathVariable UUID id,
                                                          @Valid @RequestBody WebhookRequest request) {
        return ResponseEntity.ok(webhookService.updateWebhook(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteWebhook(@PathVariable UUID id) {
        webhookService.deleteWebhook(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<Map<String, Boolean>> testWebhook(@PathVariable UUID id) {
        boolean success = webhookService.testWebhook(id);
        return ResponseEntity.ok(Map.of("success", success));
    }
}
