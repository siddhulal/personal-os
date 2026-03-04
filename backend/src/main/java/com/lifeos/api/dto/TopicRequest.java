package com.lifeos.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TopicRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private Integer orderIndex;

    private String status;

    private String notes;

    private UUID parentTopicId;
}
