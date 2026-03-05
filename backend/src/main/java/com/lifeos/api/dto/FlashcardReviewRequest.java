package com.lifeos.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashcardReviewRequest {
    @Min(1) @Max(4)
    private int rating; // 1=Again, 2=Hard, 3=Good, 4=Easy
}
