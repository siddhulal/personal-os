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
public class PracticeRecordResponse {

    private UUID id;
    private LocalDateTime practicedAt;
    private int confidenceScore;
    private int selfRating;
    private String notes;
    private int timeTakenSeconds;
    private UUID questionId;
    private LocalDateTime createdAt;
}
