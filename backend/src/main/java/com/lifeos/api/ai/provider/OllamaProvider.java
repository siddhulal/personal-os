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
public class OllamaProvider implements AiProvider {

    private final WebClient webClient;
    private final String defaultModel;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OllamaProvider(WebClient webClient, String defaultModel) {
        this.webClient = webClient;
        this.defaultModel = defaultModel;
    }

    @Override
    public String getName() {
        return "OLLAMA";
    }

    @Override
    public String complete(AiRequest request) {
        Map<String, Object> body = buildRequestBody(request, false);
        String uri = (request.getBaseUrl() != null && !request.getBaseUrl().isBlank()) 
                ? request.getBaseUrl() + "/api/chat" 
                : "/api/chat";

        String response = webClient.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode node = objectMapper.readTree(response);
            return node.path("message").path("content").asText();
        } catch (Exception e) {
            log.error("Failed to parse Ollama response", e);
            return "Error: Failed to parse response";
        }
    }

    @Override
    public Flux<String> streamComplete(AiRequest request) {
        Map<String, Object> body = buildRequestBody(request, true);
        String uri = (request.getBaseUrl() != null && !request.getBaseUrl().isBlank()) 
                ? request.getBaseUrl() + "/api/chat" 
                : "/api/chat";

        return webClient.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .mapNotNull(line -> {
                    try {
                        JsonNode node = objectMapper.readTree(line);
                        return node.path("message").path("content").asText("");
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(s -> !s.isEmpty());
    }

    public List<String> listModels(String baseUrl) {
        try {
            String uri = (baseUrl != null && !baseUrl.isBlank()) 
                    ? baseUrl + "/api/tags" 
                    : "/api/tags";

            String response = webClient.get()
                    .uri(uri)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();

            JsonNode node = objectMapper.readTree(response);
            List<String> models = new ArrayList<>();
            JsonNode modelsNode = node.path("models");
            if (modelsNode.isArray()) {
                for (JsonNode model : modelsNode) {
                    models.add(model.path("name").asText());
                }
            }
            return models;
        } catch (Exception e) {
            log.error("Failed to list Ollama models at {}", baseUrl, e);
            return List.of();
        }
    }

    private Map<String, Object> buildRequestBody(AiRequest request, boolean stream) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", request.getModel() != null ? request.getModel() : defaultModel);
        body.put("stream", stream);

        List<Map<String, String>> messages = new ArrayList<>();
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            messages.add(Map.of("role", "system", "content", request.getSystemPrompt()));
        }
        for (AiMessage msg : request.getMessages()) {
            messages.add(Map.of("role", msg.getRole(), "content", msg.getContent()));
        }
        body.put("messages", messages);

        Map<String, Object> options = new HashMap<>();
        options.put("temperature", request.getTemperature());
        body.put("options", options);

        return body;
    }
}
