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
public class FlashcardResponse {

    private UUID id;
    private String front;
    private String back;
    private String deck;
    private UUID noteId;
    private String noteTitle;

    // FSRS state
    private double stability;
    private double difficulty;
    private int reps;
    private int lapses;
    private int state;  // 0=New, 1=Learning, 2=Review, 3=Relearning
    private String stateLabel;
    private LocalDateTime lastReview;
    private LocalDateTime nextReview;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
