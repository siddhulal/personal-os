package com.lifeos.api.repository;

import com.lifeos.api.entity.CalendarEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface CalendarEventRepository extends JpaRepository<CalendarEvent, UUID> {

    List<CalendarEvent> findByUserIdAndStartTimeBetween(UUID userId, LocalDateTime start, LocalDateTime end);

    List<CalendarEvent> findByUserIdOrderByStartTimeAsc(UUID userId);
}
