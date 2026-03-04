package com.lifeos.api.repository;

import com.lifeos.api.entity.Goal;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GoalRepository extends JpaRepository<Goal, UUID> {

    Page<Goal> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    Page<Goal> findByUserIdAndStatusAndDeletedAtIsNull(UUID userId, Goal.Status status, Pageable pageable);
}
