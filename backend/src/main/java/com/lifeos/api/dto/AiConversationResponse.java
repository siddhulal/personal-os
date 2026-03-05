package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiConversationResponse {
    private UUID id;
    private String title;
    private String context;
    private List<AiChatMessageResponse> messages;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
