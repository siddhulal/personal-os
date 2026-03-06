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
import reactor.core.publisher.Mono;

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
        if (!model.startsWith("models/")) {
            model = "models/" + model;
        }
        String key = request.getApiKey() != null && !request.getApiKey().isBlank() ? request.getApiKey() : apiKey;
        Map<String, Object> body = buildRequestBody(request);

        try {
            String response = webClient.post()
                    .uri("/v1beta/{model}:generateContent?key={key}", model, key)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse -> 
                        clientResponse.bodyToMono(String.class).flatMap(errorBody -> {
                            log.error("Gemini API error: {} - {}", clientResponse.statusCode(), errorBody);
                            return Mono.error(new RuntimeException("Gemini API error: " + errorBody));
                        })
                    )
                    .bodyToMono(String.class)
                    .block();

            JsonNode node = objectMapper.readTree(response);
            JsonNode candidates = node.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText("");
                }
            }
            log.error("Unexpected Gemini response structure: {}", response);
            return "Error: Received empty or malformed response from Gemini.";
        } catch (Exception e) {
            log.error("Failed to call Gemini API or parse response", e);
            return "Error: " + e.getMessage();
        }
    }

    @Override
    public Flux<String> streamComplete(AiRequest request) {
        String model = request.getModel() != null ? request.getModel() : defaultModel;
        if (!model.startsWith("models/")) {
            model = "models/" + model;
        }
        String key = request.getApiKey() != null && !request.getApiKey().isBlank() ? request.getApiKey() : apiKey;
        Map<String, Object> body = buildRequestBody(request);

        return webClient.post()
                .uri("/v1beta/{model}:streamGenerateContent?alt=sse&key={key}", model, key)
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

    public List<String> listModels(String apiKeyOverride) {
        String key = (apiKeyOverride != null && !apiKeyOverride.isBlank()) ? apiKeyOverride : apiKey;
        try {
            String response = webClient.get()
                    .uri("/v1beta/models?key={key}", key)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode node = objectMapper.readTree(response);
            List<String> models = new ArrayList<>();
            JsonNode modelsNode = node.path("models");
            if (modelsNode.isArray()) {
                for (JsonNode m : modelsNode) {
                    String name = m.path("name").asText();
                    if (name.startsWith("models/")) {
                        name = name.substring(7);
                    }
                    // Filter for models that support generateContent
                    JsonNode methods = m.path("supportedGenerationMethods");
                    boolean supported = false;
                    if (methods.isArray()) {
                        for (JsonNode meth : methods) {
                            if (meth.asText().equals("generateContent")) {
                                supported = true;
                                break;
                            }
                        }
                    }
                    if (supported) {
                        models.add(name);
                    }
                }
            }
            return models;
        } catch (Exception e) {
            log.error("Failed to list Gemini models", e);
            return List.of("gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro");
        }
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
