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
public class RoadmapResponse {

    private UUID id;
    private String title;
    private String description;
    private List<TopicResponse> topics;
    private int totalTopics;
    private int completedTopics;
    private double progressPercentage;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
