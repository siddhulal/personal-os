package com.lifeos.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HabitRequest {

    @NotBlank(message = "Name is required")
    private String name;

    private String description;
    private String frequency; // DAILY, WEEKLY, CUSTOM
    private Integer[] frequencyDays;
    private String category;
    private String color;
    private String icon;
    private Boolean isMicroHabit;
    private String microHabitCue;
    private LocalTime reminderTime;
    private Integer targetCount;
    private Integer orderIndex;
}
