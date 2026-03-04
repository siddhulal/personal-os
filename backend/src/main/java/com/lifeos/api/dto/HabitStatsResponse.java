package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HabitStatsResponse {
    private UUID habitId;
    private String habitName;
    private int totalCompletions;
    private int currentStreak;
    private int longestStreak;
    private double completionRate; // percentage over last 30 days
    private List<WeeklyData> weeklyData;
    private List<MonthlyData> monthlyData;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyData {
        private String week; // e.g. "2024-W01"
        private int completions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonthlyData {
        private String month; // e.g. "2024-01"
        private int completions;
        private int totalDays;
        private double rate;
    }
}
