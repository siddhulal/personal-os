package com.lifeos.api.service;

import com.lifeos.api.ai.AiMessage;
import com.lifeos.api.ai.AiProvider;
import com.lifeos.api.ai.AiProviderRegistry;
import com.lifeos.api.ai.AiRequest;
import com.lifeos.api.dto.*;
import com.lifeos.api.entity.AiChatMessage;
import com.lifeos.api.entity.AiConversation;
import com.lifeos.api.entity.AiSettings;
import com.lifeos.api.entity.User;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.AiChatMessageRepository;
import com.lifeos.api.repository.AiConversationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiChatService {

    private final AiConversationRepository conversationRepository;
    private final AiChatMessageRepository messageRepository;
    private final AiSettingsService settingsService;
    private final AiProviderRegistry providerRegistry;

    @Transactional
    public SseEmitter chat(AiChatRequest request) {
        User user = getCurrentUser();
        AiSettings settings = settingsService.getOrCreateSettings(user);

        // Load or create conversation
        AiConversation conversation;
        if (request.getConversationId() != null) {
            conversation = conversationRepository.findByIdAndUserId(request.getConversationId(), user.getId())
                    .orElseThrow(() -> new ResourceNotFoundException("Conversation", "id", request.getConversationId()));
        } else {
            conversation = AiConversation.builder()
                    .title(truncateTitle(request.getMessage()))
                    .context(request.getContext())
                    .user(user)
                    .build();
            conversation = conversationRepository.save(conversation);
        }

        // Save user message
        AiChatMessage userMessage = AiChatMessage.builder()
                .role(AiChatMessage.Role.USER)
                .content(request.getMessage())
                .conversation(conversation)
                .build();
        messageRepository.save(userMessage);

        // Build message history
        List<AiChatMessage> history = messageRepository.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        List<AiMessage> messages = history.stream()
                .map(m -> AiMessage.builder()
                        .role(m.getRole().name().toLowerCase())
                        .content(m.getContent())
                        .build())
                .collect(Collectors.toList());

        // Resolve provider
        AiProvider provider = providerRegistry.getProvider(settings.getActiveProvider().name());
        String model = resolveModel(settings);
        String apiKey = resolveApiKey(settings);
        String baseUrl = resolveBaseUrl(settings);

        AiRequest aiRequest = AiRequest.builder()
                .systemPrompt("You are a helpful AI assistant for a personal productivity app called Life OS. " +
                        "You help with task management, learning, interview preparation, note-taking, and general productivity. " +
                        "Be concise but thorough. Use markdown formatting when helpful.")
                .messages(messages)
                .model(model)
                .apiKey(apiKey)
                .baseUrl(baseUrl)
                .build();

        // Stream response via SSE, collecting tokens for persistence
        SseEmitter emitter = new SseEmitter(300000L); // 5 min timeout
        final UUID conversationId = conversation.getId();
        final StringBuilder fullResponse = new StringBuilder();

        provider.streamComplete(aiRequest)
                .subscribe(
                        token -> {
                            fullResponse.append(token);
                            try {
                                emitter.send(SseEmitter.event()
                                        .name("token")
                                        .data(token));
                            } catch (IOException e) {
                                emitter.completeWithError(e);
                            }
                        },
                        error -> {
                            log.error("Stream error", error);
                            try {
                                emitter.send(SseEmitter.event()
                                        .name("error")
                                        .data(error.getMessage()));
                            } catch (IOException ignored) {}
                            emitter.completeWithError(error);
                        },
                        () -> {
                            try {
                                // Save collected response
                                saveAssistantResponse(conversationId, fullResponse.toString());
                                emitter.send(SseEmitter.event()
                                        .name("done")
                                        .data(conversationId.toString()));
                                emitter.complete();
                            } catch (IOException e) {
                                emitter.completeWithError(e);
                            }
                        }
                );

        emitter.onTimeout(emitter::complete);
        emitter.onError(e -> log.error("SSE error", e));

        return emitter;
    }

    private void saveAssistantResponse(UUID conversationId, String content) {
        AiConversation conversation = conversationRepository.findById(conversationId).orElse(null);
        if (conversation != null) {
            AiChatMessage assistantMessage = AiChatMessage.builder()
                    .role(AiChatMessage.Role.ASSISTANT)
                    .content(content)
                    .conversation(conversation)
                    .build();
            messageRepository.save(assistantMessage);
        }
    }

    public PageResponse<AiConversationResponse> getConversations(Pageable pageable) {
        User user = getCurrentUser();
        Page<AiConversation> page = conversationRepository.findByUserIdAndDeletedAtIsNull(user.getId(), pageable);
        List<AiConversationResponse> content = page.getContent().stream()
                .map(this::mapToConversationResponse)
                .collect(Collectors.toList());

        return PageResponse.<AiConversationResponse>builder()
                .content(content)
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .page(page.getNumber())
                .size(page.getSize())
                .last(page.isLast())
                .build();
    }

    public AiConversationResponse getConversation(UUID id) {
        User user = getCurrentUser();
        AiConversation conversation = conversationRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", "id", id));

        AiConversationResponse response = mapToConversationResponse(conversation);
        List<AiChatMessage> messages = messageRepository.findByConversationIdOrderByCreatedAtAsc(id);
        response.setMessages(messages.stream()
                .map(this::mapToMessageResponse)
                .collect(Collectors.toList()));
        return response;
    }

    @Transactional
    public void deleteConversation(UUID id) {
        User user = getCurrentUser();
        AiConversation conversation = conversationRepository.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Conversation", "id", id));
        conversation.softDelete();
        conversationRepository.save(conversation);
    }

    private String resolveModel(AiSettings settings) {
        return switch (settings.getActiveProvider()) {
            case OLLAMA -> settings.getOllamaModel();
            case OPENAI -> settings.getOpenaiModel();
            case GEMINI -> settings.getGeminiModel();
        };
    }

    private String resolveApiKey(AiSettings settings) {
        return switch (settings.getActiveProvider()) {
            case OLLAMA -> null;
            case OPENAI -> settings.getOpenaiApiKey();
            case GEMINI -> settings.getGeminiApiKey();
        };
    }

    private String resolveBaseUrl(AiSettings settings) {
        return switch (settings.getActiveProvider()) {
            case OLLAMA -> settings.getOllamaBaseUrl();
            case OPENAI, GEMINI -> null;
        };
    }

    private String truncateTitle(String message) {
        if (message.length() <= 50) return message;
        return message.substring(0, 47) + "...";
    }

    private AiConversationResponse mapToConversationResponse(AiConversation conversation) {
        return AiConversationResponse.builder()
                .id(conversation.getId())
                .title(conversation.getTitle())
                .context(conversation.getContext())
                .createdAt(conversation.getCreatedAt())
                .updatedAt(conversation.getUpdatedAt())
                .build();
    }

    private AiChatMessageResponse mapToMessageResponse(AiChatMessage message) {
        return AiChatMessageResponse.builder()
                .id(message.getId())
                .role(message.getRole().name())
                .content(message.getContent())
                .createdAt(message.getCreatedAt())
                .build();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
