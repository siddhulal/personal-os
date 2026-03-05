package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiSettingsRequest {
    private String activeProvider;
    private String ollamaBaseUrl;
    private String ollamaModel;
    private String openaiApiKey;
    private String openaiModel;
    private String geminiApiKey;
    private String geminiModel;
}
