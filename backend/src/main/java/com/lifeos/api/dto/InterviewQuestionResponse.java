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
public class InterviewQuestionResponse {

    private UUID id;
    private String questionText;
    private String category;
    private String difficulty;
    private List<TagResponse> tags;
    private List<InterviewAnswerResponse> answers;
    private int practiceCount;
    private Integer lastConfidenceScore;
    private String practiceStatus;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
