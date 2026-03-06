package com.lifeos.api.ai;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiRequest {
    private String systemPrompt;
    private List<AiMessage> messages;
    private String model;
    private String apiKey;
    private String baseUrl;
    @Builder.Default
    private double temperature = 0.7;
}
