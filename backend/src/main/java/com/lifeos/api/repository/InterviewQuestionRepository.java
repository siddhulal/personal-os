package com.lifeos.api.repository;

import com.lifeos.api.entity.InterviewQuestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface InterviewQuestionRepository extends JpaRepository<InterviewQuestion, UUID> {

    Page<InterviewQuestion> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    Page<InterviewQuestion> findByUserIdAndCategoryAndDeletedAtIsNull(UUID userId, String category, Pageable pageable);

    @Query("SELECT q FROM InterviewQuestion q WHERE q.user.id = :userId AND q.deletedAt IS NULL " +
           "AND LOWER(q.questionText) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<InterviewQuestion> search(@Param("userId") UUID userId, @Param("query") String query);

    @Query("SELECT q FROM InterviewQuestion q WHERE q.user.id = :userId AND q.deletedAt IS NULL ORDER BY RANDOM()")
    Page<InterviewQuestion> findRandomQuestion(@Param("userId") UUID userId, Pageable pageable);
}
