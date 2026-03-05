package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlashcardStatsResponse {
    private int totalCards;
    private int dueCards;
    private int newCards;
    private int learningCards;
    private int reviewCards;
    private int masteredCards;
    private List<String> decks;
}
