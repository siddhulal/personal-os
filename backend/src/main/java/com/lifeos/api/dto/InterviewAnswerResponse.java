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
public class InterviewAnswerResponse {

    private UUID id;
    private String answerText;
    private String keyPoints;
    private String exampleScenarios;
    private String mistakesToAvoid;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
