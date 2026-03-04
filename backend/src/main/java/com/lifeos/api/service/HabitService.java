package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HabitService {

    private final HabitRepository habitRepository;
    private final HabitCompletionRepository completionRepository;

    public List<HabitResponse> getAllHabits() {
        UUID userId = getCurrentUserId();
        List<Habit> habits = habitRepository.findByUserIdAndDeletedAtIsNullOrderByOrderIndexAsc(userId);
        return habits.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<HabitResponse> getActiveHabits() {
        UUID userId = getCurrentUserId();
        List<Habit> habits = habitRepository.findByUserIdAndDeletedAtIsNullAndArchivedAtIsNullOrderByOrderIndexAsc(userId);
        return habits.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<HabitResponse> getTodayHabits() {
        UUID userId = getCurrentUserId();
        LocalDate today = LocalDate.now();
        int dayOfWeek = today.getDayOfWeek().getValue(); // 1=Mon ... 7=Sun

        List<Habit> habits = habitRepository.findByUserIdAndDeletedAtIsNullAndArchivedAtIsNullOrderByOrderIndexAsc(userId);
        List<HabitCompletion> todayCompletions = completionRepository.findByUserIdAndDate(userId, today);
        Set<UUID> completedIds = todayCompletions.stream()
            .map(c -> c.getHabit().getId()).collect(Collectors.toSet());

        return habits.stream()
            .filter(h -> isHabitScheduledForDay(h, dayOfWeek))
            .map(h -> {
                HabitResponse resp = mapToResponse(h);
                resp.setCompletedToday(completedIds.contains(h.getId()));
                return resp;
            })
            .collect(Collectors.toList());
    }

    public HabitResponse getHabit(UUID id) {
        Habit habit = findHabitByIdAndUser(id);
        return mapToResponse(habit);
    }

    @Transactional
    public HabitResponse createHabit(HabitRequest request) {
        User user = getCurrentUser();
        Habit habit = new Habit();
        habit.setName(request.getName());
        habit.setDescription(request.getDescription());
        habit.setFrequency(request.getFrequency() != null
            ? Habit.Frequency.valueOf(request.getFrequency()) : Habit.Frequency.DAILY);
        habit.setFrequencyDays(request.getFrequencyDays());
        habit.setCategory(request.getCategory());
        habit.setColor(request.getColor() != null ? request.getColor() : "#6366f1");
        habit.setIcon(request.getIcon() != null ? request.getIcon() : "check");
        habit.setMicroHabit(request.getIsMicroHabit() != null && request.getIsMicroHabit());
        habit.setMicroHabitCue(request.getMicroHabitCue());
        habit.setReminderTime(request.getReminderTime());
        habit.setTargetCount(request.getTargetCount() != null ? request.getTargetCount() : 1);
        habit.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        habit.setUser(user);

        habit = habitRepository.save(habit);
        return mapToResponse(habit);
    }

    @Transactional
    public HabitResponse updateHabit(UUID id, HabitRequest request) {
        Habit habit = findHabitByIdAndUser(id);
        habit.setName(request.getName());
        habit.setDescription(request.getDescription());
        if (request.getFrequency() != null) {
            habit.setFrequency(Habit.Frequency.valueOf(request.getFrequency()));
        }
        habit.setFrequencyDays(request.getFrequencyDays());
        habit.setCategory(request.getCategory());
        if (request.getColor() != null) habit.setColor(request.getColor());
        if (request.getIcon() != null) habit.setIcon(request.getIcon());
        if (request.getIsMicroHabit() != null) habit.setMicroHabit(request.getIsMicroHabit());
        habit.setMicroHabitCue(request.getMicroHabitCue());
        habit.setReminderTime(request.getReminderTime());
        if (request.getTargetCount() != null) habit.setTargetCount(request.getTargetCount());
        if (request.getOrderIndex() != null) habit.setOrderIndex(request.getOrderIndex());

        habit = habitRepository.save(habit);
        return mapToResponse(habit);
    }

    @Transactional
    public void deleteHabit(UUID id) {
        Habit habit = findHabitByIdAndUser(id);
        habit.softDelete();
        habitRepository.save(habit);
    }

    @Transactional
    public HabitCompletionResponse toggleCompletion(UUID habitId, LocalDate date) {
        Habit habit = findHabitByIdAndUser(habitId);
        Optional<HabitCompletion> existing = completionRepository.findByHabitIdAndCompletedDate(habitId, date);

        if (existing.isPresent()) {
            completionRepository.delete(existing.get());
            return null; // uncompleted
        }

        HabitCompletion completion = HabitCompletion.builder()
            .habit(habit)
            .user(getCurrentUser())
            .completedDate(date)
            .completedAt(LocalDateTime.now())
            .value(1)
            .build();

        completion = completionRepository.save(completion);
        return mapCompletionToResponse(completion);
    }

    public List<HabitCompletionResponse> getCompletions(UUID habitId, LocalDate start, LocalDate end) {
        findHabitByIdAndUser(habitId); // auth check
        List<HabitCompletion> completions = completionRepository
            .findByHabitIdAndCompletedDateBetweenOrderByCompletedDateDesc(habitId, start, end);
        return completions.stream().map(this::mapCompletionToResponse).collect(Collectors.toList());
    }

    public HabitStatsResponse getStats(UUID habitId) {
        Habit habit = findHabitByIdAndUser(habitId);
        List<HabitCompletion> allCompletions = completionRepository.findByHabitIdOrderByCompletedDateDesc(habitId);
        int totalCompletions = allCompletions.size();

        // Streaks
        int currentStreak = calculateCurrentStreak(allCompletions);
        int longestStreak = calculateLongestStreak(allCompletions);

        // Completion rate (last 30 days)
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        long recentCompletions = allCompletions.stream()
            .filter(c -> !c.getCompletedDate().isBefore(thirtyDaysAgo))
            .count();
        double completionRate = 30 > 0 ? (recentCompletions / 30.0) * 100 : 0;

        // Weekly data (last 8 weeks)
        List<HabitStatsResponse.WeeklyData> weeklyData = new ArrayList<>();
        WeekFields weekFields = WeekFields.of(DayOfWeek.MONDAY, 1);
        Map<String, Integer> weekMap = new LinkedHashMap<>();
        for (int i = 7; i >= 0; i--) {
            LocalDate d = LocalDate.now().minusWeeks(i);
            String key = d.getYear() + "-W" + String.format("%02d", d.get(weekFields.weekOfWeekBasedYear()));
            weekMap.put(key, 0);
        }
        for (HabitCompletion c : allCompletions) {
            String key = c.getCompletedDate().getYear() + "-W" +
                String.format("%02d", c.getCompletedDate().get(weekFields.weekOfWeekBasedYear()));
            weekMap.computeIfPresent(key, (k, v) -> v + 1);
        }
        weekMap.forEach((k, v) -> weeklyData.add(
            HabitStatsResponse.WeeklyData.builder().week(k).completions(v).build()));

        // Monthly data (last 6 months)
        List<HabitStatsResponse.MonthlyData> monthlyData = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            LocalDate monthStart = LocalDate.now().minusMonths(i).withDayOfMonth(1);
            LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);
            int totalDays = monthEnd.getDayOfMonth();
            int completions = completionRepository.countByHabitIdAndCompletedDateBetween(habitId, monthStart, monthEnd);
            String monthKey = monthStart.format(DateTimeFormatter.ofPattern("yyyy-MM"));
            monthlyData.add(HabitStatsResponse.MonthlyData.builder()
                .month(monthKey).completions(completions).totalDays(totalDays)
                .rate(totalDays > 0 ? (completions / (double) totalDays) * 100 : 0)
                .build());
        }

        return HabitStatsResponse.builder()
            .habitId(habit.getId())
            .habitName(habit.getName())
            .totalCompletions(totalCompletions)
            .currentStreak(currentStreak)
            .longestStreak(longestStreak)
            .completionRate(completionRate)
            .weeklyData(weeklyData)
            .monthlyData(monthlyData)
            .build();
    }

    public HabitInsightsResponse getInsights() {
        UUID userId = getCurrentUserId();
        List<Habit> allHabits = habitRepository.findByUserIdAndDeletedAtIsNullOrderByOrderIndexAsc(userId);
        List<Habit> activeHabits = allHabits.stream()
            .filter(h -> h.getArchivedAt() == null).collect(Collectors.toList());

        LocalDate today = LocalDate.now();
        LocalDate weekStart = today.with(DayOfWeek.MONDAY);
        LocalDate monthStart = today.withDayOfMonth(1);

        List<HabitCompletion> weekCompletions = completionRepository.findByUserIdAndDateRange(userId, weekStart, today);
        List<HabitCompletion> monthCompletions = completionRepository.findByUserIdAndDateRange(userId, monthStart, today);

        // Overall completion rate (last 30 days)
        LocalDate thirtyDaysAgo = today.minusDays(30);
        List<HabitCompletion> last30 = completionRepository.findByUserIdAndDateRange(userId, thirtyDaysAgo, today);
        double overallRate = activeHabits.isEmpty() ? 0 :
            (last30.size() / (double)(activeHabits.size() * 30)) * 100;

        // Top streaks
        List<HabitInsightsResponse.HabitSummary> topStreaks = activeHabits.stream()
            .map(h -> {
                List<HabitCompletion> comps = completionRepository.findByHabitIdOrderByCompletedDateDesc(h.getId());
                return HabitInsightsResponse.HabitSummary.builder()
                    .habitId(h.getId().toString())
                    .name(h.getName())
                    .color(h.getColor())
                    .currentStreak(calculateCurrentStreak(comps))
                    .longestStreak(calculateLongestStreak(comps))
                    .completionRate(0)
                    .build();
            })
            .sorted(Comparator.comparingInt(HabitInsightsResponse.HabitSummary::getCurrentStreak).reversed())
            .limit(5)
            .collect(Collectors.toList());

        // Best performing (by 30-day completion rate)
        List<HabitInsightsResponse.HabitSummary> bestPerforming = activeHabits.stream()
            .map(h -> {
                int count = completionRepository.countByHabitIdAndCompletedDateBetween(h.getId(), thirtyDaysAgo, today);
                double rate = (count / 30.0) * 100;
                return HabitInsightsResponse.HabitSummary.builder()
                    .habitId(h.getId().toString())
                    .name(h.getName())
                    .color(h.getColor())
                    .currentStreak(0)
                    .longestStreak(0)
                    .completionRate(rate)
                    .build();
            })
            .sorted(Comparator.comparingDouble(HabitInsightsResponse.HabitSummary::getCompletionRate).reversed())
            .limit(5)
            .collect(Collectors.toList());

        // Daily rates (last 30 days)
        List<HabitInsightsResponse.DailyCompletionRate> dailyRates = new ArrayList<>();
        for (int i = 29; i >= 0; i--) {
            LocalDate d = today.minusDays(i);
            List<HabitCompletion> dayCompletions = completionRepository.findByUserIdAndDate(userId, d);
            int total = activeHabits.size();
            int completed = dayCompletions.size();
            dailyRates.add(HabitInsightsResponse.DailyCompletionRate.builder()
                .date(d.toString())
                .rate(total > 0 ? (completed / (double) total) * 100 : 0)
                .completed(completed)
                .total(total)
                .build());
        }

        return HabitInsightsResponse.builder()
            .totalHabits(allHabits.size())
            .activeHabits(activeHabits.size())
            .overallCompletionRate(overallRate)
            .totalCompletionsThisWeek(weekCompletions.size())
            .totalCompletionsThisMonth(monthCompletions.size())
            .topStreaks(topStreaks)
            .bestPerforming(bestPerforming)
            .dailyRates(dailyRates)
            .build();
    }

    // ==================== Private Helpers ====================

    private boolean isHabitScheduledForDay(Habit habit, int dayOfWeek) {
        if (habit.getFrequency() == Habit.Frequency.DAILY) return true;
        if (habit.getFrequency() == Habit.Frequency.WEEKLY) {
            return dayOfWeek == 1; // Monday only for weekly
        }
        if (habit.getFrequency() == Habit.Frequency.CUSTOM && habit.getFrequencyDays() != null) {
            for (Integer day : habit.getFrequencyDays()) {
                if (day != null && day == dayOfWeek) return true;
            }
        }
        return false;
    }

    private int calculateCurrentStreak(List<HabitCompletion> completions) {
        if (completions.isEmpty()) return 0;

        Set<LocalDate> dates = completions.stream()
            .map(HabitCompletion::getCompletedDate).collect(Collectors.toSet());

        int streak = 0;
        LocalDate date = LocalDate.now();
        // Allow today or yesterday to start
        if (!dates.contains(date)) {
            date = date.minusDays(1);
        }
        while (dates.contains(date)) {
            streak++;
            date = date.minusDays(1);
        }
        return streak;
    }

    private int calculateLongestStreak(List<HabitCompletion> completions) {
        if (completions.isEmpty()) return 0;

        List<LocalDate> dates = completions.stream()
            .map(HabitCompletion::getCompletedDate)
            .sorted()
            .distinct()
            .collect(Collectors.toList());

        int longest = 1;
        int current = 1;
        for (int i = 1; i < dates.size(); i++) {
            if (dates.get(i).equals(dates.get(i - 1).plusDays(1))) {
                current++;
                longest = Math.max(longest, current);
            } else {
                current = 1;
            }
        }
        return longest;
    }

    private HabitResponse mapToResponse(Habit habit) {
        List<HabitCompletion> completions = completionRepository.findByHabitIdOrderByCompletedDateDesc(habit.getId());
        boolean completedToday = completionRepository.findByHabitIdAndCompletedDate(habit.getId(), LocalDate.now()).isPresent();

        return HabitResponse.builder()
            .id(habit.getId())
            .name(habit.getName())
            .description(habit.getDescription())
            .frequency(habit.getFrequency().name())
            .frequencyDays(habit.getFrequencyDays())
            .category(habit.getCategory())
            .color(habit.getColor())
            .icon(habit.getIcon())
            .isMicroHabit(habit.isMicroHabit())
            .microHabitCue(habit.getMicroHabitCue())
            .reminderTime(habit.getReminderTime())
            .targetCount(habit.getTargetCount())
            .orderIndex(habit.getOrderIndex())
            .completedToday(completedToday)
            .currentStreak(calculateCurrentStreak(completions))
            .longestStreak(calculateLongestStreak(completions))
            .createdAt(habit.getCreatedAt())
            .updatedAt(habit.getUpdatedAt())
            .archivedAt(habit.getArchivedAt())
            .build();
    }

    private HabitCompletionResponse mapCompletionToResponse(HabitCompletion c) {
        return HabitCompletionResponse.builder()
            .id(c.getId())
            .habitId(c.getHabit().getId())
            .completedDate(c.getCompletedDate())
            .completedAt(c.getCompletedAt())
            .value(c.getValue())
            .notes(c.getNotes())
            .build();
    }

    private Habit findHabitByIdAndUser(UUID id) {
        Habit habit = habitRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Habit", "id", id));
        if (!habit.getUser().getId().equals(getCurrentUserId()) || habit.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Habit", "id", id);
        }
        return habit;
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
