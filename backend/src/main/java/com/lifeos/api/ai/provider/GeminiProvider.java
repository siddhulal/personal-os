package com.lifeos.api.ai.provider;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifeos.api.ai.AiMessage;
import com.lifeos.api.ai.AiProvider;
import com.lifeos.api.ai.AiRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
public class GeminiProvider implements AiProvider {

    private final WebClient webClient;
    private final String defaultModel;
    private final String apiKey;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeminiProvider(WebClient webClient, String defaultModel, String apiKey) {
        this.webClient = webClient;
        this.defaultModel = defaultModel;
        this.apiKey = apiKey;
    }

    @Override
    public String getName() {
        return "GEMINI";
    }

    @Override
    public String complete(AiRequest request) {
        String model = request.getModel() != null ? request.getModel() : defaultModel;
        Map<String, Object> body = buildRequestBody(request);

        String response = webClient.post()
                .uri("/v1beta/models/{model}:generateContent?key={key}", model, apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode node = objectMapper.readTree(response);
            return node.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();
        } catch (Exception e) {
            log.error("Failed to parse Gemini response", e);
            return "Error: Failed to parse response";
        }
    }

    @Override
    public Flux<String> streamComplete(AiRequest request) {
        String model = request.getModel() != null ? request.getModel() : defaultModel;
        Map<String, Object> body = buildRequestBody(request);

        return webClient.post()
                .uri("/v1beta/models/{model}:streamGenerateContent?alt=sse&key={key}", model, apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .mapNotNull(line -> {
                    String data = line.startsWith("data: ") ? line.substring(6) : line;
                    if (data.isBlank()) return null;
                    try {
                        JsonNode node = objectMapper.readTree(data);
                        return node.path("candidates").get(0)
                                .path("content").path("parts").get(0)
                                .path("text").asText("");
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(s -> !s.isEmpty());
    }

    private Map<String, Object> buildRequestBody(AiRequest request) {
        Map<String, Object> body = new HashMap<>();

        List<Map<String, Object>> contents = new ArrayList<>();

        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            body.put("systemInstruction", Map.of(
                    "parts", List.of(Map.of("text", request.getSystemPrompt()))
            ));
        }

        for (AiMessage msg : request.getMessages()) {
            String role = msg.getRole().equals("assistant") ? "model" : "user";
            contents.add(Map.of(
                    "role", role,
                    "parts", List.of(Map.of("text", msg.getContent()))
            ));
        }
        body.put("contents", contents);

        body.put("generationConfig", Map.of(
                "temperature", request.getTemperature()
        ));

        return body;
    }
}
