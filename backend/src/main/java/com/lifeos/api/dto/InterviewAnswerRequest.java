package com.lifeos.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterviewAnswerRequest {

    @NotBlank(message = "Answer text is required")
    private String answerText;

    private String keyPoints;

    private String exampleScenarios;

    private String mistakesToAvoid;
}
