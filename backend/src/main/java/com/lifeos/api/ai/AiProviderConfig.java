package com.lifeos.api.ai;

import com.lifeos.api.ai.provider.GeminiProvider;
import com.lifeos.api.ai.provider.OllamaProvider;
import com.lifeos.api.ai.provider.OpenAiProvider;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Slf4j
@Configuration
public class AiProviderConfig {

    @Value("${ai.ollama.base-url}")
    private String ollamaBaseUrl;

    @Value("${ai.ollama.model}")
    private String ollamaModel;

    @Value("${ai.openai.api-key}")
    private String openaiApiKey;

    @Value("${ai.openai.model}")
    private String openaiModel;

    @Value("${ai.gemini.api-key}")
    private String geminiApiKey;

    @Value("${ai.gemini.model}")
    private String geminiModel;

    private final AiProviderRegistry registry;

    public AiProviderConfig(AiProviderRegistry registry) {
        this.registry = registry;
    }

    @PostConstruct
    public void initProviders() {
        // Ollama is always registered (local)
        WebClient ollamaClient = buildWebClient(ollamaBaseUrl);
        registry.register(new OllamaProvider(ollamaClient, ollamaModel));
        log.info("Registered Ollama provider at {}", ollamaBaseUrl);

        // OpenAI (registered if key is set)
        WebClient openaiClient = buildWebClient("https://api.openai.com");
        registry.register(new OpenAiProvider(openaiClient, openaiModel, openaiApiKey));
        log.info("Registered OpenAI provider");

        // Gemini (registered if key is set)
        WebClient geminiClient = buildWebClient("https://generativelanguage.googleapis.com");
        registry.register(new GeminiProvider(geminiClient, geminiModel, geminiApiKey));
        log.info("Registered Gemini provider");
    }

    private WebClient buildWebClient(String baseUrl) {
        HttpClient httpClient = HttpClient.create()
                .responseTimeout(Duration.ofMinutes(5));

        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(16 * 1024 * 1024))
                .build();

        return WebClient.builder()
                .baseUrl(baseUrl)
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .exchangeStrategies(strategies)
                .build();
    }
}
