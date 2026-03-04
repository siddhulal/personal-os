package com.lifeos.api.repository;

import com.lifeos.api.entity.Habit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface HabitRepository extends JpaRepository<Habit, UUID> {

    List<Habit> findByUserIdAndDeletedAtIsNullAndArchivedAtIsNullOrderByOrderIndexAsc(UUID userId);

    List<Habit> findByUserIdAndDeletedAtIsNullOrderByOrderIndexAsc(UUID userId);

    int countByUserIdAndDeletedAtIsNullAndArchivedAtIsNull(UUID userId);
}
