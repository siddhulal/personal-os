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
public class TopicResponse {

    private UUID id;
    private String title;
    private String description;
    private int orderIndex;
    private String status;
    private String notes;
    private UUID parentTopicId;
    private List<TopicResponse> subtopics;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
