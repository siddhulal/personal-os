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
public class OpenAiProvider implements AiProvider {

    private final WebClient webClient;
    private final String defaultModel;
    private final String apiKey;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OpenAiProvider(WebClient webClient, String defaultModel, String apiKey) {
        this.webClient = webClient;
        this.defaultModel = defaultModel;
        this.apiKey = apiKey;
    }

    @Override
    public String getName() {
        return "OPENAI";
    }

    @Override
    public String complete(AiRequest request) {
        Map<String, Object> body = buildRequestBody(request, false);
        String resolvedKey = resolveApiKey(request);

        String response = webClient.post()
                .uri("/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + resolvedKey)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode node = objectMapper.readTree(response);
            return node.path("choices").get(0).path("message").path("content").asText();
        } catch (Exception e) {
            log.error("Failed to parse OpenAI response", e);
            return "Error: Failed to parse response";
        }
    }

    @Override
    public Flux<String> streamComplete(AiRequest request) {
        Map<String, Object> body = buildRequestBody(request, true);
        String resolvedKey = resolveApiKey(request);

        return webClient.post()
                .uri("/v1/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + resolvedKey)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .mapNotNull(line -> {
                    String data = line.startsWith("data: ") ? line.substring(6) : line;
                    if (data.equals("[DONE]") || data.isBlank()) return null;
                    try {
                        JsonNode node = objectMapper.readTree(data);
                        JsonNode delta = node.path("choices").get(0).path("delta");
                        return delta.has("content") ? delta.path("content").asText("") : null;
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(s -> s != null && !s.isEmpty());
    }

    private String resolveApiKey(AiRequest request) {
        return apiKey;
    }

    private Map<String, Object> buildRequestBody(AiRequest request, boolean stream) {
        Map<String, Object> body = new HashMap<>();
        body.put("model", request.getModel() != null ? request.getModel() : defaultModel);
        body.put("stream", stream);
        body.put("temperature", request.getTemperature());

        List<Map<String, String>> messages = new ArrayList<>();
        if (request.getSystemPrompt() != null && !request.getSystemPrompt().isBlank()) {
            messages.add(Map.of("role", "system", "content", request.getSystemPrompt()));
        }
        for (AiMessage msg : request.getMessages()) {
            messages.add(Map.of("role", msg.getRole(), "content", msg.getContent()));
        }
        body.put("messages", messages);

        return body;
    }
}
