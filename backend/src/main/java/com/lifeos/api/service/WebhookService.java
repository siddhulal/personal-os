package com.lifeos.api.service;

import com.lifeos.api.dto.WebhookRequest;
import com.lifeos.api.dto.WebhookResponse;
import com.lifeos.api.entity.User;
import com.lifeos.api.entity.Webhook;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.WebhookRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WebhookService {

    private final WebhookRepository webhookRepository;

    public List<WebhookResponse> listWebhooks() {
        UUID userId = getCurrentUserId();
        List<Webhook> webhooks = webhookRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return webhooks.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public WebhookResponse createWebhook(WebhookRequest request) {
        User user = getCurrentUser();
        Webhook webhook = new Webhook();
        webhook.setName(request.getName());
        webhook.setUrl(request.getUrl());
        webhook.setSecret(request.getSecret());
        webhook.setEvents(request.getEvents());
        webhook.setActive(request.isActive());
        webhook.setFailureCount(0);
        webhook.setUser(user);

        webhook = webhookRepository.save(webhook);
        return mapToResponse(webhook);
    }

    @Transactional
    public WebhookResponse updateWebhook(UUID id, WebhookRequest request) {
        Webhook webhook = findByIdAndUser(id);
        webhook.setName(request.getName());
        webhook.setUrl(request.getUrl());
        if (request.getSecret() != null) {
            webhook.setSecret(request.getSecret());
        }
        webhook.setEvents(request.getEvents());
        webhook.setActive(request.isActive());

        webhook = webhookRepository.save(webhook);
        return mapToResponse(webhook);
    }

    @Transactional
    public void deleteWebhook(UUID id) {
        Webhook webhook = findByIdAndUser(id);
        webhookRepository.delete(webhook);
    }

    @Transactional
    public boolean testWebhook(UUID id) {
        Webhook webhook = findByIdAndUser(id);
        try {
            HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(webhook.getUrl()))
                .POST(HttpRequest.BodyPublishers.ofString("{\"event\":\"test\",\"timestamp\":\"" + LocalDateTime.now() + "\"}"))
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(10))
                .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            boolean success = response.statusCode() >= 200 && response.statusCode() < 300;

            if (success) {
                webhook.setLastTriggeredAt(LocalDateTime.now());
                webhook.setFailureCount(0);
            } else {
                webhook.setFailureCount(webhook.getFailureCount() + 1);
            }
            webhookRepository.save(webhook);
            return success;
        } catch (Exception e) {
            webhook.setFailureCount(webhook.getFailureCount() + 1);
            webhookRepository.save(webhook);
            return false;
        }
    }

    // ==================== Private Helpers ====================

    private Webhook findByIdAndUser(UUID id) {
        Webhook webhook = webhookRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Webhook", "id", id));
        if (!webhook.getUser().getId().equals(getCurrentUserId())) {
            throw new ResourceNotFoundException("Webhook", "id", id);
        }
        return webhook;
    }

    private WebhookResponse mapToResponse(Webhook webhook) {
        return WebhookResponse.builder()
            .id(webhook.getId())
            .name(webhook.getName())
            .url(webhook.getUrl())
            .hasSecret(webhook.getSecret() != null && !webhook.getSecret().isEmpty())
            .events(webhook.getEvents())
            .isActive(webhook.isActive())
            .lastTriggeredAt(webhook.getLastTriggeredAt())
            .failureCount(webhook.getFailureCount())
            .createdAt(webhook.getCreatedAt())
            .updatedAt(webhook.getUpdatedAt())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
