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
public class HabitInsightsResponse {
    private int totalHabits;
    private int activeHabits;
    private double overallCompletionRate;
    private int totalCompletionsThisWeek;
    private int totalCompletionsThisMonth;
    private List<HabitSummary> topStreaks;
    private List<HabitSummary> bestPerforming;
    private List<DailyCompletionRate> dailyRates;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HabitSummary {
        private String habitId;
        private String name;
        private String color;
        private int currentStreak;
        private int longestStreak;
        private double completionRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyCompletionRate {
        private String date;
        private double rate;
        private int completed;
        private int total;
    }
}
