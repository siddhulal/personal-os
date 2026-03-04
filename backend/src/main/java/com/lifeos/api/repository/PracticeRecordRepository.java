package com.lifeos.api.repository;

import com.lifeos.api.entity.PracticeRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PracticeRecordRepository extends JpaRepository<PracticeRecord, UUID> {

    List<PracticeRecord> findByQuestionIdAndUserIdAndDeletedAtIsNull(UUID questionId, UUID userId);

    Optional<PracticeRecord> findTopByQuestionIdAndUserIdOrderByPracticedAtDesc(UUID questionId, UUID userId);

    int countByQuestionIdAndUserIdAndDeletedAtIsNull(UUID questionId, UUID userId);

    @Query("SELECT COUNT(pr) FROM PracticeRecord pr WHERE pr.user.id = :userId " +
           "AND pr.practicedAt >= :weekStart AND pr.deletedAt IS NULL")
    long countPracticedThisWeek(@Param("userId") UUID userId, @Param("weekStart") LocalDateTime weekStart);

    int countByUserIdAndDeletedAtIsNull(UUID userId);
}
