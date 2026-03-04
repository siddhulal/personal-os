package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HabitCompletionResponse {
    private UUID id;
    private UUID habitId;
    private LocalDate completedDate;
    private LocalDateTime completedAt;
    private int value;
    private String notes;
}
