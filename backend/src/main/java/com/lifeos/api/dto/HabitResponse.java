package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HabitResponse {

    private UUID id;
    private String name;
    private String description;
    private String frequency;
    private Integer[] frequencyDays;
    private String category;
    private String color;
    private String icon;
    private boolean isMicroHabit;
    private String microHabitCue;
    private LocalTime reminderTime;
    private int targetCount;
    private int orderIndex;
    private boolean completedToday;
    private int currentStreak;
    private int longestStreak;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime archivedAt;
}
