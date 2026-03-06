package com.lifeos.api.service;

import com.lifeos.api.dto.AnalyticsResponse;
import com.lifeos.api.entity.*;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final TaskRepository taskRepository;
    private final NoteRepository noteRepository;
    private final FlashcardRepository flashcardRepository;
    private final HabitRepository habitRepository;
    private final HabitCompletionRepository habitCompletionRepository;
    private final PomodoroSessionRepository pomodoroSessionRepository;
    private final ProjectRepository projectRepository;

    public AnalyticsResponse getAnalytics() {
        UUID userId = getCurrentUserId();
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        // Task stats
        var allTasks = taskRepository.findByUserIdAndDeletedAtIsNull(userId, PageRequest.of(0, 10000));
        int totalTasks = (int) allTasks.getTotalElements();
        int completedTasks = (int) allTasks.getContent().stream()
            .filter(t -> t.getStatus() == Task.Status.DONE)
            .count();

        // Project stats
        var allProjects = projectRepository.findByUserIdAndDeletedAtIsNull(userId, PageRequest.of(0, 10000));
        int totalProjects = (int) allProjects.getTotalElements();
        int activeProjects = (int) allProjects.getContent().stream()
            .filter(p -> p.getStatus() == Project.Status.ACTIVE)
            .count();

        // Note stats
        var allNotes = noteRepository.findByUserIdAndDeletedAtIsNull(userId, PageRequest.of(0, 1));
        int totalNotes = (int) allNotes.getTotalElements();

        // Flashcard stats
        int totalFlashcards = flashcardRepository.countByUserIdAndDeletedAtIsNull(userId);
        int flashcardsDue = flashcardRepository.countDueCards(userId, now);

        // Habit stats
        int totalHabits = habitRepository.countByUserIdAndDeletedAtIsNullAndArchivedAtIsNull(userId);
        var activeHabits = habitRepository.findByUserIdAndDeletedAtIsNullAndArchivedAtIsNullOrderByOrderIndexAsc(userId);
        LocalDate thirtyDaysAgo = today.minusDays(30);
        var last30Completions = habitCompletionRepository.findByUserIdAndDateRange(userId, thirtyDaysAgo, today);
        double habitCompletionRate = activeHabits.isEmpty() ? 0 :
            (last30Completions.size() / (double) (activeHabits.size() * 30)) * 100;

        // Pomodoro stats
        LocalDateTime weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
        List<PomodoroSession> allSessions = pomodoroSessionRepository.findByUserIdOrderByStartedAtDesc(userId);
        int pomodoroSessionsThisWeek = (int) allSessions.stream()
            .filter(s -> s.getStartedAt().isAfter(weekStart))
            .count();
        int totalFocusMinutes = allSessions.stream().mapToInt(PomodoroSession::getDurationMinutes).sum();

        // Streaks (based on habit completions)
        int currentStreak = calculateCurrentStreak(userId, activeHabits);
        int longestStreak = calculateLongestStreak(userId, activeHabits);

        // Daily activity for last 30 days
        List<AnalyticsResponse.DailyActivity> dailyActivity = buildDailyActivity(userId, allTasks.getContent(), allSessions, today);

        // Weekly trends for last 12 weeks
        List<AnalyticsResponse.WeeklyTrend> weeklyTrends = buildWeeklyTrends(userId, allTasks.getContent(), allSessions, today);

        return AnalyticsResponse.builder()
            .totalTasks(totalTasks)
            .completedTasks(completedTasks)
            .totalProjects(totalProjects)
            .activeProjects(activeProjects)
            .totalNotes(totalNotes)
            .totalFlashcards(totalFlashcards)
            .flashcardsDue(flashcardsDue)
            .totalHabits(totalHabits)
            .habitCompletionRate(Math.round(habitCompletionRate * 100.0) / 100.0)
            .pomodoroSessionsThisWeek(pomodoroSessionsThisWeek)
            .totalFocusMinutes(totalFocusMinutes)
            .currentStreak(currentStreak)
            .longestStreak(longestStreak)
            .dailyActivity(dailyActivity)
            .weeklyTrends(weeklyTrends)
            .build();
    }

    // ==================== Private Helpers ====================

    private List<AnalyticsResponse.DailyActivity> buildDailyActivity(
            UUID userId, List<Task> tasks, List<PomodoroSession> sessions, LocalDate today) {
        List<AnalyticsResponse.DailyActivity> dailyActivity = new ArrayList<>();
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;

        for (int i = 29; i >= 0; i--) {
            LocalDate date = today.minusDays(i);
            LocalDateTime dayStart = date.atStartOfDay();
            LocalDateTime dayEnd = date.plusDays(1).atStartOfDay();

            int taskCount = (int) tasks.stream()
                .filter(t -> t.getStatus() == Task.Status.DONE
                    && t.getUpdatedAt() != null
                    && !t.getUpdatedAt().isBefore(dayStart)
                    && t.getUpdatedAt().isBefore(dayEnd))
                .count();

            int pomodoroCount = (int) sessions.stream()
                .filter(s -> !s.getStartedAt().isBefore(dayStart) && s.getStartedAt().isBefore(dayEnd))
                .count();

            int noteCount = (int) noteRepository.countByUserIdAndUpdatedAtBetween(userId, dayStart, dayEnd);
            int flashcardCount = (int) flashcardRepository.countReviewedBetween(userId, dayStart, dayEnd);

            dailyActivity.add(AnalyticsResponse.DailyActivity.builder()
                .date(date.format(fmt))
                .tasks(taskCount)
                .notes(noteCount)
                .flashcards(flashcardCount)
                .pomodoros(pomodoroCount)
                .build());
        }
        return dailyActivity;
    }

    private List<AnalyticsResponse.WeeklyTrend> buildWeeklyTrends(
            UUID userId, List<Task> tasks, List<PomodoroSession> sessions, LocalDate today) {
        List<AnalyticsResponse.WeeklyTrend> weeklyTrends = new ArrayList<>();

        for (int i = 11; i >= 0; i--) {
            LocalDate weekStartDate = today.minusWeeks(i).with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            LocalDate weekEndDate = weekStartDate.plusDays(6);
            LocalDateTime wStart = weekStartDate.atStartOfDay();
            LocalDateTime wEnd = weekEndDate.plusDays(1).atStartOfDay();

            int completedTasks = (int) tasks.stream()
                .filter(t -> t.getStatus() == Task.Status.DONE
                    && t.getUpdatedAt() != null
                    && !t.getUpdatedAt().isBefore(wStart)
                    && t.getUpdatedAt().isBefore(wEnd))
                .count();

            int weekNotes = (int) noteRepository.countByUserIdAndUpdatedAtBetween(userId, wStart, wEnd);
            int weekFlashcards = (int) flashcardRepository.countReviewedBetween(userId, wStart, wEnd);
            int productivity = completedTasks + weekNotes + weekFlashcards;

            int focusMinutes = sessions.stream()
                .filter(s -> !s.getStartedAt().isBefore(wStart) && s.getStartedAt().isBefore(wEnd))
                .mapToInt(PomodoroSession::getDurationMinutes)
                .sum();

            String weekLabel = weekStartDate.format(DateTimeFormatter.ISO_LOCAL_DATE);
            weeklyTrends.add(AnalyticsResponse.WeeklyTrend.builder()
                .week(weekLabel)
                .productivity(productivity)
                .focusMinutes(focusMinutes)
                .build());
        }
        return weeklyTrends;
    }

    private int calculateCurrentStreak(UUID userId, List<Habit> activeHabits) {
        if (activeHabits.isEmpty()) return 0;

        int streak = 0;
        LocalDate date = LocalDate.now();
        // Check if today or yesterday started
        List<HabitCompletion> todayCompletions = habitCompletionRepository.findByUserIdAndDate(userId, date);
        if (todayCompletions.isEmpty()) {
            date = date.minusDays(1);
        }

        while (true) {
            List<HabitCompletion> dayCompletions = habitCompletionRepository.findByUserIdAndDate(userId, date);
            if (dayCompletions.isEmpty()) break;
            streak++;
            date = date.minusDays(1);
        }
        return streak;
    }

    private int calculateLongestStreak(UUID userId, List<Habit> activeHabits) {
        if (activeHabits.isEmpty()) return 0;

        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(90);
        var completions = habitCompletionRepository.findByUserIdAndDateRange(userId, thirtyDaysAgo, LocalDate.now());

        Set<LocalDate> activeDates = completions.stream()
            .map(HabitCompletion::getCompletedDate)
            .collect(Collectors.toSet());

        List<LocalDate> sortedDates = new ArrayList<>(activeDates);
        Collections.sort(sortedDates);

        if (sortedDates.isEmpty()) return 0;

        int longest = 1;
        int current = 1;
        for (int i = 1; i < sortedDates.size(); i++) {
            if (sortedDates.get(i).equals(sortedDates.get(i - 1).plusDays(1))) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 1;
            }
        }
        return longest;
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
