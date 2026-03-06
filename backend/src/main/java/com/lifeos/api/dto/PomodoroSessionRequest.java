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
public class PomodoroSessionRequest {

    private UUID taskId;
    private int durationMinutes;
    private int breakMinutes;
    private String status;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private String notes;
}
