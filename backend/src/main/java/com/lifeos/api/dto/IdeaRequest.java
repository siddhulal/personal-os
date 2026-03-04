package com.lifeos.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IdeaRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String description;

    private String status;

    private String category;

    private List<UUID> tagIds;
}
