package com.lifeos.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String level;

    private Integer confidenceScore;

    private LocalDate lastPracticed;

    private String category;

    private String notes;

    private List<UUID> tagIds;
}
