package com.lifeos.api.repository;

import com.lifeos.api.entity.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {

    Page<Task> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    List<Task> findByUserIdAndDueDateAndDeletedAtIsNull(UUID userId, LocalDate dueDate);

    List<Task> findByUserIdAndDueDateBeforeAndStatusNotAndDeletedAtIsNull(
            UUID userId, LocalDate date, Task.Status status);

    List<Task> findByUserIdAndDueDateBetweenAndDeletedAtIsNull(
            UUID userId, LocalDate start, LocalDate end);

    @Query("SELECT t FROM Task t WHERE t.user.id = :userId AND t.deletedAt IS NULL " +
           "AND (LOWER(t.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(t.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Task> search(@Param("userId") UUID userId, @Param("query") String query);

    Page<Task> findByUserIdAndProjectIdAndDeletedAtIsNull(UUID userId, UUID projectId, Pageable pageable);

    int countByUserIdAndProjectIdAndDeletedAtIsNull(UUID userId, UUID projectId);
}
