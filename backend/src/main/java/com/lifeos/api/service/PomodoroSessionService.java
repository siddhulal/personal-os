package com.lifeos.api.service;

import com.lifeos.api.dto.PomodoroSessionRequest;
import com.lifeos.api.dto.PomodoroSessionResponse;
import com.lifeos.api.entity.PomodoroSession;
import com.lifeos.api.entity.Task;
import com.lifeos.api.entity.User;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.PomodoroSessionRepository;
import com.lifeos.api.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
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
public class PomodoroSessionService {

    private final PomodoroSessionRepository pomodoroSessionRepository;
    private final TaskRepository taskRepository;

    public List<PomodoroSessionResponse> listSessions() {
        UUID userId = getCurrentUserId();
        List<PomodoroSession> sessions = pomodoroSessionRepository.findByUserIdOrderByStartedAtDesc(userId);
        return sessions.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public List<PomodoroSessionResponse> getSessionsByDateRange(LocalDateTime start, LocalDateTime end) {
        UUID userId = getCurrentUserId();
        List<PomodoroSession> sessions = pomodoroSessionRepository.findByUserIdAndStartedAtBetween(userId, start, end);
        return sessions.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public PomodoroSessionResponse createSession(PomodoroSessionRequest request) {
        User user = getCurrentUser();
        PomodoroSession session = new PomodoroSession();
        session.setDurationMinutes(request.getDurationMinutes());
        session.setBreakMinutes(request.getBreakMinutes());
        session.setStatus(request.getStatus() != null ? request.getStatus() : "completed");
        session.setStartedAt(request.getStartedAt() != null ? request.getStartedAt() : LocalDateTime.now());
        session.setCompletedAt(request.getCompletedAt());
        session.setNotes(request.getNotes());
        session.setUser(user);

        if (request.getTaskId() != null) {
            Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task", "id", request.getTaskId()));
            session.setTask(task);
        }

        session = pomodoroSessionRepository.save(session);
        return mapToResponse(session);
    }

    @Transactional
    public void deleteSession(UUID id) {
        PomodoroSession session = findByIdAndUser(id);
        pomodoroSessionRepository.delete(session);
    }

    public Map<String, Object> getStats() {
        UUID userId = getCurrentUserId();
        List<PomodoroSession> allSessions = pomodoroSessionRepository.findByUserIdOrderByStartedAtDesc(userId);

        int totalSessions = allSessions.size();
        int totalMinutes = allSessions.stream().mapToInt(PomodoroSession::getDurationMinutes).sum();
        double averageMinutes = totalSessions > 0 ? (double) totalMinutes / totalSessions : 0;

        LocalDateTime weekStart = LocalDate.now()
            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            .atStartOfDay();
        long sessionsThisWeek = allSessions.stream()
            .filter(s -> s.getStartedAt().isAfter(weekStart))
            .count();

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalSessions", totalSessions);
        stats.put("totalMinutes", totalMinutes);
        stats.put("averageMinutes", Math.round(averageMinutes * 100.0) / 100.0);
        stats.put("sessionsThisWeek", sessionsThisWeek);
        return stats;
    }

    // ==================== Private Helpers ====================

    private PomodoroSession findByIdAndUser(UUID id) {
        PomodoroSession session = pomodoroSessionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("PomodoroSession", "id", id));
        if (!session.getUser().getId().equals(getCurrentUserId())) {
            throw new ResourceNotFoundException("PomodoroSession", "id", id);
        }
        return session;
    }

    private PomodoroSessionResponse mapToResponse(PomodoroSession session) {
        return PomodoroSessionResponse.builder()
            .id(session.getId())
            .taskId(session.getTask() != null ? session.getTask().getId() : null)
            .taskTitle(session.getTask() != null ? session.getTask().getTitle() : null)
            .durationMinutes(session.getDurationMinutes())
            .breakMinutes(session.getBreakMinutes())
            .status(session.getStatus())
            .startedAt(session.getStartedAt())
            .completedAt(session.getCompletedAt())
            .notes(session.getNotes())
            .createdAt(session.getCreatedAt())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
