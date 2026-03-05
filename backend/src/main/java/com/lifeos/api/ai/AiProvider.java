package com.lifeos.api.ai;

import reactor.core.publisher.Flux;

public interface AiProvider {
    String getName();
    String complete(AiRequest request);
    Flux<String> streamComplete(AiRequest request);
}
