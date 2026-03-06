package com.lifeos.api.service;

import com.lifeos.api.dto.CalendarEventRequest;
import com.lifeos.api.dto.CalendarEventResponse;
import com.lifeos.api.entity.CalendarEvent;
import com.lifeos.api.entity.Task;
import com.lifeos.api.entity.User;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.CalendarEventRepository;
import com.lifeos.api.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CalendarEventService {

    private final CalendarEventRepository calendarEventRepository;
    private final TaskRepository taskRepository;

    public List<CalendarEventResponse> listEvents(LocalDateTime start, LocalDateTime end) {
        UUID userId = getCurrentUserId();
        List<CalendarEvent> events = calendarEventRepository.findByUserIdAndStartTimeBetween(userId, start, end);
        return events.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    public CalendarEventResponse getEvent(UUID id) {
        CalendarEvent event = findByIdAndUser(id);
        return mapToResponse(event);
    }

    @Transactional
    public CalendarEventResponse createEvent(CalendarEventRequest request) {
        User user = getCurrentUser();
        CalendarEvent event = new CalendarEvent();
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setAllDay(request.isAllDay());
        event.setColor(request.getColor());
        event.setCategory(request.getCategory());
        event.setRecurrenceRule(request.getRecurrenceRule());
        event.setUser(user);

        if (request.getTaskId() != null) {
            Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task", "id", request.getTaskId()));
            event.setTask(task);
        }

        event = calendarEventRepository.save(event);
        return mapToResponse(event);
    }

    @Transactional
    public CalendarEventResponse updateEvent(UUID id, CalendarEventRequest request) {
        CalendarEvent event = findByIdAndUser(id);
        event.setTitle(request.getTitle());
        event.setDescription(request.getDescription());
        event.setStartTime(request.getStartTime());
        event.setEndTime(request.getEndTime());
        event.setAllDay(request.isAllDay());
        if (request.getColor() != null) event.setColor(request.getColor());
        if (request.getCategory() != null) event.setCategory(request.getCategory());
        event.setRecurrenceRule(request.getRecurrenceRule());

        if (request.getTaskId() != null) {
            Task task = taskRepository.findById(request.getTaskId())
                .orElseThrow(() -> new ResourceNotFoundException("Task", "id", request.getTaskId()));
            event.setTask(task);
        } else {
            event.setTask(null);
        }

        event = calendarEventRepository.save(event);
        return mapToResponse(event);
    }

    @Transactional
    public void deleteEvent(UUID id) {
        CalendarEvent event = findByIdAndUser(id);
        calendarEventRepository.delete(event);
    }

    // ==================== Private Helpers ====================

    private CalendarEvent findByIdAndUser(UUID id) {
        CalendarEvent event = calendarEventRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("CalendarEvent", "id", id));
        if (!event.getUser().getId().equals(getCurrentUserId())) {
            throw new ResourceNotFoundException("CalendarEvent", "id", id);
        }
        return event;
    }

    private CalendarEventResponse mapToResponse(CalendarEvent event) {
        return CalendarEventResponse.builder()
            .id(event.getId())
            .title(event.getTitle())
            .description(event.getDescription())
            .startTime(event.getStartTime())
            .endTime(event.getEndTime())
            .allDay(event.isAllDay())
            .color(event.getColor())
            .category(event.getCategory())
            .taskId(event.getTask() != null ? event.getTask().getId() : null)
            .taskTitle(event.getTask() != null ? event.getTask().getTitle() : null)
            .recurrenceRule(event.getRecurrenceRule())
            .createdAt(event.getCreatedAt())
            .updatedAt(event.getUpdatedAt())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
