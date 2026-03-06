package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSettingsResponse {
    private UUID id;
    private String activeProvider;
    private String ollamaBaseUrl;
    private String ollamaModel;
    private boolean openaiKeySet;
    private String openaiApiKey;
    private String openaiModel;
    private boolean geminiKeySet;
    private String geminiApiKey;
    private String geminiModel;
}
