package com.lifeos.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PracticeRecordRequest {

    @NotNull(message = "Confidence score is required")
    @Min(value = 1, message = "Confidence score must be at least 1")
    @Max(value = 10, message = "Confidence score must be at most 10")
    private Integer confidenceScore;

    @Min(value = 1, message = "Self rating must be at least 1")
    @Max(value = 5, message = "Self rating must be at most 5")
    private Integer selfRating;

    private String notes;

    private Integer timeTakenSeconds;
}
