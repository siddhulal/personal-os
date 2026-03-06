package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final TaskRepository taskRepository;
    private final ProjectRepository projectRepository;
    private final LearningTopicRepository learningTopicRepository;
    private final LearningRoadmapRepository learningRoadmapRepository;
    private final SkillRepository skillRepository;
    private final InterviewQuestionRepository interviewQuestionRepository;
    private final PracticeRecordRepository practiceRecordRepository;
    private final HabitRepository habitRepository;
    private final HabitCompletionRepository habitCompletionRepository;
    private final NoteRepository noteRepository;
    private final FlashcardRepository flashcardRepository;
    private final InterviewService interviewService;

    @Transactional(readOnly = true)
    public DashboardResponse getDashboard() {
        UUID userId = getCurrentUserId();
        LocalDate today = LocalDate.now();
        LocalDate weekEnd = today.plusDays(7);

        // Today's tasks: due today + active tasks without due date (TODO/IN_PROGRESS)
        List<Task> todayTasks = taskRepository.findTodayDashboardTasks(userId, today);

        // Overdue tasks (past due, not done)
        List<Task> overdueTasks = taskRepository.findByUserIdAndDueDateBeforeAndStatusNotAndDeletedAtIsNull(
            userId, today, Task.Status.DONE);

        // Upcoming tasks (next 7 days)
        List<Task> upcomingTasks = taskRepository.findByUserIdAndDueDateBetweenAndDeletedAtIsNull(
            userId, today.plusDays(1), weekEnd);

        // Active projects
        var activeProjects = projectRepository.findByUserIdAndStatusAndDeletedAtIsNull(
            userId, Project.Status.ACTIVE, PageRequest.of(0, 5));

        // Learning progress - aggregate across all roadmaps
        var roadmaps = learningRoadmapRepository.findByUserIdAndDeletedAtIsNull(userId, PageRequest.of(0, 100));
        int totalTopics = 0;
        int completedTopics = 0;
        for (var roadmap : roadmaps) {
            for (var topic : roadmap.getTopics()) {
                if (topic.getDeletedAt() == null) {
                    totalTopics++;
                    if (topic.getStatus() == LearningTopic.Status.COMPLETED) {
                        completedTopics++;
                    }
                }
            }
        }

        var skills = skillRepository.findByUserIdAndDeletedAtIsNull(userId, PageRequest.of(0, 100));

        LocalDateTime weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
        long studySessions = practiceRecordRepository.countPracticedThisWeek(userId, weekStart);

        LearningProgressDTO learningProgress = LearningProgressDTO.builder()
            .totalTopics(totalTopics)
            .completedTopics(completedTopics)
            .progressPercentage(totalTopics > 0 ? (double) completedTopics / totalTopics * 100 : 0)
            .totalSkills((int) skills.getTotalElements())
            .studySessionsThisWeek((int) studySessions)
            .build();

        // Interview progress — use the real calculation from InterviewService
        InterviewProgressDTO interviewProgress;
        try {
            interviewProgress = interviewService.getInterviewProgress();
        } catch (Exception e) {
            interviewProgress = InterviewProgressDTO.builder()
                .totalQuestions(0).masteredQuestions(0).practicedThisWeek(0)
                .topicProgress(new HashMap<>()).build();
        }

        // Habit progress
        var activeHabits = habitRepository.findByUserIdAndDeletedAtIsNullAndArchivedAtIsNullOrderByOrderIndexAsc(userId);
        var todayCompletions = habitCompletionRepository.findByUserIdAndDate(userId, today);
        int bestStreak = 0;
        for (var habit : activeHabits) {
            var comps = habitCompletionRepository.findByHabitIdOrderByCompletedDateDesc(habit.getId());
            int streak = calculateCurrentStreak(comps);
            if (streak > bestStreak) bestStreak = streak;
        }
        DashboardResponse.HabitProgressDTO habitProgress = DashboardResponse.HabitProgressDTO.builder()
            .totalHabits(activeHabits.size())
            .completedToday(todayCompletions.size())
            .todayTotal(activeHabits.size())
            .bestStreak(bestStreak)
            .build();

        // Daily digest
        LocalDateTime todayStart = today.atStartOfDay();
        var recentlyModifiedNotes = noteRepository.findByUserIdAndDeletedAtIsNull(userId,
            PageRequest.of(0, 100, org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "updatedAt")));
        List<String> recentNoteTitles = recentlyModifiedNotes.getContent().stream()
            .filter(n -> n.getUpdatedAt() != null && n.getUpdatedAt().isAfter(todayStart))
            .limit(5)
            .map(n -> n.getTitle())
            .collect(Collectors.toList());
        int notesModifiedToday = (int) recentlyModifiedNotes.getContent().stream()
            .filter(n -> n.getUpdatedAt() != null && n.getUpdatedAt().isAfter(todayStart))
            .count();
        int flashcardsDue = flashcardRepository.countDueCards(userId, LocalDateTime.now());

        // Build summary
        StringBuilder summary = new StringBuilder();
        if (!overdueTasks.isEmpty()) {
            summary.append(overdueTasks.size()).append(" overdue task").append(overdueTasks.size() > 1 ? "s" : "").append(". ");
        }
        if (!todayTasks.isEmpty()) {
            summary.append(todayTasks.size()).append(" task").append(todayTasks.size() > 1 ? "s" : "").append(" due today. ");
        }
        if (flashcardsDue > 0) {
            summary.append(flashcardsDue).append(" flashcard").append(flashcardsDue > 1 ? "s" : "").append(" to review. ");
        }
        if (notesModifiedToday > 0) {
            summary.append("You worked on ").append(notesModifiedToday).append(" note").append(notesModifiedToday > 1 ? "s" : "").append(" today. ");
        }
        if (habitProgress.getCompletedToday() > 0) {
            summary.append(habitProgress.getCompletedToday()).append("/").append(habitProgress.getTodayTotal()).append(" habits done. ");
        }
        if (summary.length() == 0) {
            summary.append("All caught up! No urgent items.");
        }

        DashboardResponse.DigestDTO digest = DashboardResponse.DigestDTO.builder()
            .notesModifiedToday(notesModifiedToday)
            .flashcardsDue(flashcardsDue)
            .recentNotes(recentNoteTitles)
            .summary(summary.toString().trim())
            .build();

        return DashboardResponse.builder()
            .todayTasks(todayTasks.stream().map(this::mapTaskResponse).collect(Collectors.toList()))
            .overdueTasks(overdueTasks.stream().map(this::mapTaskResponse).collect(Collectors.toList()))
            .upcomingTasks(upcomingTasks.stream().map(this::mapTaskResponse).collect(Collectors.toList()))
            .activeProjects(activeProjects.getContent().stream().map(this::mapProjectResponse).collect(Collectors.toList()))
            .learningProgress(learningProgress)
            .interviewProgress(interviewProgress)
            .habitProgress(habitProgress)
            .digest(digest)
            .build();
    }

    private TaskResponse mapTaskResponse(Task task) {
        return TaskResponse.builder()
            .id(task.getId())
            .title(task.getTitle())
            .description(task.getDescription())
            .status(task.getStatus().name())
            .priority(task.getPriority().name())
            .dueDate(task.getDueDate())
            .projectId(task.getProject() != null ? task.getProject().getId() : null)
            .projectName(task.getProject() != null ? task.getProject().getName() : null)
            .tags(task.getTags() != null ? task.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .createdAt(task.getCreatedAt())
            .updatedAt(task.getUpdatedAt())
            .build();
    }

    private ProjectResponse mapProjectResponse(Project project) {
        return ProjectResponse.builder()
            .id(project.getId())
            .name(project.getName())
            .description(project.getDescription())
            .status(project.getStatus().name())
            .taskCount(project.getTasks() != null ? (int) project.getTasks().stream().filter(t -> t.getDeletedAt() == null).count() : 0)
            .noteCount(project.getNotes() != null ? (int) project.getNotes().stream().filter(n -> n.getDeletedAt() == null).count() : 0)
            .createdAt(project.getCreatedAt())
            .updatedAt(project.getUpdatedAt())
            .build();
    }

    private int calculateCurrentStreak(List<HabitCompletion> completions) {
        if (completions.isEmpty()) return 0;
        Set<LocalDate> dates = completions.stream()
            .map(HabitCompletion::getCompletedDate).collect(Collectors.toSet());
        int streak = 0;
        LocalDate date = LocalDate.now();
        if (!dates.contains(date)) date = date.minusDays(1);
        while (dates.contains(date)) {
            streak++;
            date = date.minusDays(1);
        }
        return streak;
    }

    private UUID getCurrentUserId() {
        return ((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId();
    }
}
