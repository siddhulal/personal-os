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
public class InterviewQuestionRequest {

    @NotBlank(message = "Question text is required")
    private String questionText;

    private String category;

    private String difficulty;

    private List<UUID> tagIds;
}
