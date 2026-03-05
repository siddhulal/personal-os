package com.lifeos.api.ai;

import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

@Component
public class AiProviderRegistry {

    private final Map<String, AiProvider> providers = new HashMap<>();

    public void register(AiProvider provider) {
        providers.put(provider.getName(), provider);
    }

    public AiProvider getProvider(String name) {
        AiProvider provider = providers.get(name);
        if (provider == null) {
            throw new IllegalArgumentException("Unknown AI provider: " + name);
        }
        return provider;
    }

    public Set<String> getAvailableProviders() {
        return providers.keySet();
    }

    public boolean hasProvider(String name) {
        return providers.containsKey(name);
    }
}
