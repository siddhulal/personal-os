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
            // Using manual URI construction to prevent slash encoding
            String uri = "/v1beta/" + model + ":generateContent?key=" + key;
            log.info("Sending request to Gemini API. URI: {}", uri);
            
            String response = webClient.post()
                    .uri(uri)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .onStatus(status -> status.isError(), clientResponse -> 
                        clientResponse.bodyToMono(String.class).flatMap(errorBody -> {
                            log.error("Gemini API error: {} - {}", clientResponse.statusCode(), errorBody);
                            return Mono.error(new RuntimeException("Gemini API error status " + clientResponse.statusCode() + ": " + errorBody));
                        })
                    )
                    .bodyToMono(String.class)
                    .timeout(java.time.Duration.ofSeconds(60))
                    .block();

            if (response == null || response.isBlank()) {
                log.error("Gemini API returned null or blank response body for model: {}", model);
                return "Error: Received empty response from Gemini API. Please check your network or API key.";
            }

            JsonNode node = objectMapper.readTree(response);
            JsonNode candidates = node.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode candidate = candidates.get(0);
                
                // Check for finish reason
                if (candidate.has("finishReason") && !"STOP".equals(candidate.path("finishReason").asText())) {
                    String reason = candidate.path("finishReason").asText();
                    log.warn("Gemini generation finished with reason: {}", reason);
                    if ("SAFETY".equals(reason)) return "Error: Response was blocked by Gemini safety filters.";
                }

                JsonNode parts = candidate.path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText("");
                }
            }
            
            if (node.has("promptFeedback") && node.path("promptFeedback").has("blockReason")) {
                return "Error: Request blocked by Gemini safety filters: " + node.path("promptFeedback").path("blockReason").asText();
            }

            log.error("Unexpected Gemini response structure: {}", response);
            return "Error: Gemini returned a successful response but no text was generated.";
        } catch (Exception e) {
            log.error("Gemini Provider Exception for model {}: {}", model, e.getMessage());
            return "Error calling Gemini: " + e.getMessage();
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

        String uri = "/v1beta/" + model + ":streamGenerateContent?alt=sse&key=" + key;
        log.info("Sending streaming request to Gemini API. URI: {}", uri);

        return webClient.post()
                .uri(uri)
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
                    .uri("/v1beta/models?key=" + key)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode node = objectMapper.readTree(response);
            List<String> models = new ArrayList<>();
            JsonNode modelsNode = node.path("models");
            if (modelsNode.isArray()) {
                for (JsonNode m : modelsNode) {
                    String name = m.path("name").asText();
                    if (!name.startsWith("models/")) {
                        name = "models/" + name;
                    }
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
            return List.of("models/gemini-1.5-flash", "models/gemini-1.5-pro", "models/gemini-1.0-pro");
        }
    }

    private Map<String, Object> buildRequestBody(AiRequest request) {
        Map<String, Object> body = new HashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();

        StringBuilder combinedUserText = new StringBuilder();
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            combinedUserText.append(request.getSystemPrompt()).append("\n\n");
        }

        for (AiMessage msg : request.getMessages()) {
            String role = msg.getRole().equals("assistant") ? "model" : "user";
            
            if (role.equals("user")) {
                if (combinedUserText.length() > 0) combinedUserText.append("---\n");
                combinedUserText.append(msg.getContent());
            } else {
                if (combinedUserText.length() > 0) {
                    contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", combinedUserText.toString()))));
                    combinedUserText.setLength(0);
                }
                contents.add(Map.of("role", "model", "parts", List.of(Map.of("text", msg.getContent()))));
            }
        }
        
        if (combinedUserText.length() > 0) {
            contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", combinedUserText.toString()))));
        }

        if (contents.isEmpty()) {
            contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", "Continue writing based on context."))));
        }

        body.put("contents", contents);
        
        // --- ADD SAFETY SETTINGS ---
        List<Map<String, String>> safetySettings = new ArrayList<>();
        String[] categories = {
            "HARM_CATEGORY_HARASSMENT",
            "HARM_CATEGORY_HATE_SPEECH",
            "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            "HARM_CATEGORY_DANGEROUS_CONTENT"
        };
        for (String category : categories) {
            safetySettings.add(Map.of(
                "category", category,
                "threshold", "BLOCK_NONE"
            ));
        }
        body.put("safetySettings", safetySettings);

        Map<String, Object> generationConfig = new HashMap<>();
        generationConfig.put("temperature", request.getTemperature());

        // For thinking models (2.5+), set a low thinking budget for fast responses
        String modelName = request.getModel() != null ? request.getModel() : defaultModel;
        if (modelName.contains("2.5")) {
            generationConfig.put("thinkingConfig", Map.of("thinkingBudget", 1024));
        }

        body.put("generationConfig", generationConfig);

        return body;
    }
}
