package com.lifeos.api.repository;

import com.lifeos.api.entity.HabitCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface HabitCompletionRepository extends JpaRepository<HabitCompletion, UUID> {

    Optional<HabitCompletion> findByHabitIdAndCompletedDate(UUID habitId, LocalDate date);

    List<HabitCompletion> findByHabitIdAndCompletedDateBetweenOrderByCompletedDateDesc(
            UUID habitId, LocalDate start, LocalDate end);

    List<HabitCompletion> findByHabitIdOrderByCompletedDateDesc(UUID habitId);

    int countByHabitId(UUID habitId);

    int countByHabitIdAndCompletedDateBetween(UUID habitId, LocalDate start, LocalDate end);

    @Query("SELECT hc FROM HabitCompletion hc WHERE hc.user.id = :userId AND hc.completedDate = :date")
    List<HabitCompletion> findByUserIdAndDate(@Param("userId") UUID userId, @Param("date") LocalDate date);

    @Query("SELECT hc FROM HabitCompletion hc WHERE hc.user.id = :userId AND hc.completedDate BETWEEN :start AND :end")
    List<HabitCompletion> findByUserIdAndDateRange(
            @Param("userId") UUID userId, @Param("start") LocalDate start, @Param("end") LocalDate end);

    void deleteByHabitIdAndCompletedDate(UUID habitId, LocalDate date);
}
