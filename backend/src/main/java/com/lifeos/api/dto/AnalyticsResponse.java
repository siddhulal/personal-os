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
public class AnalyticsResponse {

    private int totalTasks;
    private int completedTasks;
    private int totalProjects;
    private int activeProjects;
    private int totalNotes;
    private int totalFlashcards;
    private int flashcardsDue;
    private int totalHabits;
    private double habitCompletionRate;
    private int pomodoroSessionsThisWeek;
    private int totalFocusMinutes;
    private int currentStreak;
    private int longestStreak;
    private List<DailyActivity> dailyActivity;
    private List<WeeklyTrend> weeklyTrends;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DailyActivity {
        private String date;
        private int tasks;
        private int notes;
        private int flashcards;
        private int pomodoros;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WeeklyTrend {
        private String week;
        private int productivity;
        private int focusMinutes;
    }
}
