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
public class DashboardResponse {

    private List<TaskResponse> todayTasks;
    private List<TaskResponse> overdueTasks;
    private List<TaskResponse> upcomingTasks;
    private List<ProjectResponse> activeProjects;
    private LearningProgressDTO learningProgress;
    private InterviewProgressDTO interviewProgress;
    private HabitProgressDTO habitProgress;
    private DigestDTO digest;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class HabitProgressDTO {
        private int totalHabits;
        private int completedToday;
        private int todayTotal;
        private int bestStreak;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DigestDTO {
        private int notesModifiedToday;
        private int flashcardsDue;
        private List<String> recentNotes;
        private String summary;
    }
}
