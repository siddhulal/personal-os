package com.lifeos.api.repository;

import com.lifeos.api.entity.PomodoroSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface PomodoroSessionRepository extends JpaRepository<PomodoroSession, UUID> {

    List<PomodoroSession> findByUserIdOrderByStartedAtDesc(UUID userId);

    List<PomodoroSession> findByUserIdAndStartedAtBetween(UUID userId, LocalDateTime start, LocalDateTime end);
}
