package com.lifeos.api.service;

import com.lifeos.api.dto.AiSettingsRequest;
import com.lifeos.api.dto.AiSettingsResponse;
import com.lifeos.api.entity.AiSettings;
import com.lifeos.api.entity.User;
import com.lifeos.api.repository.AiSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AiSettingsService {

    private final AiSettingsRepository aiSettingsRepository;

    public AiSettingsResponse getSettings() {
        User user = getCurrentUser();
        AiSettings settings = getOrCreateSettings(user);
        return mapToResponse(settings);
    }

    @Transactional
    public AiSettingsResponse updateSettings(AiSettingsRequest request) {
        User user = getCurrentUser();
        AiSettings settings = getOrCreateSettings(user);

        if (request.getActiveProvider() != null) {
            settings.setActiveProvider(AiSettings.Provider.valueOf(request.getActiveProvider()));
        }
        if (request.getOllamaBaseUrl() != null) {
            settings.setOllamaBaseUrl(request.getOllamaBaseUrl());
        }
        if (request.getOllamaModel() != null) {
            settings.setOllamaModel(request.getOllamaModel());
        }
        if (request.getOpenaiApiKey() != null) {
            settings.setOpenaiApiKey(request.getOpenaiApiKey());
        }
        if (request.getOpenaiModel() != null) {
            settings.setOpenaiModel(request.getOpenaiModel());
        }
        if (request.getGeminiApiKey() != null) {
            settings.setGeminiApiKey(request.getGeminiApiKey());
        }
        if (request.getGeminiModel() != null) {
            settings.setGeminiModel(request.getGeminiModel());
        }

        settings = aiSettingsRepository.save(settings);
        return mapToResponse(settings);
    }

    public AiSettings getOrCreateSettings(User user) {
        return aiSettingsRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    AiSettings newSettings = AiSettings.builder()
                            .user(user)
                            .activeProvider(AiSettings.Provider.OLLAMA)
                            .ollamaBaseUrl("http://localhost:11434")
                            .ollamaModel("qwen3:14b")
                            .openaiModel("gpt-4o")
                            .geminiModel("gemini-1.5-flash")
                            .build();
                    return aiSettingsRepository.save(newSettings);
                });
    }

    private AiSettingsResponse mapToResponse(AiSettings settings) {
        return AiSettingsResponse.builder()
                .id(settings.getId())
                .activeProvider(settings.getActiveProvider().name())
                .ollamaBaseUrl(settings.getOllamaBaseUrl())
                .ollamaModel(settings.getOllamaModel())
                .openaiKeySet(settings.getOpenaiApiKey() != null && !settings.getOpenaiApiKey().isBlank())
                .openaiModel(settings.getOpenaiModel())
                .geminiKeySet(settings.getGeminiApiKey() != null && !settings.getGeminiApiKey().isBlank())
                .geminiModel(settings.getGeminiModel())
                .build();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
