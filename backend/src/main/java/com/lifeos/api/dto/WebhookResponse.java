package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WebhookResponse {

    private UUID id;
    private String name;
    private String url;
    private boolean hasSecret;
    private String[] events;
    private boolean isActive;
    private LocalDateTime lastTriggeredAt;
    private int failureCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
