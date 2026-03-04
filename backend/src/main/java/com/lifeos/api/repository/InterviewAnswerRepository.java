package com.lifeos.api.repository;

import com.lifeos.api.entity.InterviewAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface InterviewAnswerRepository extends JpaRepository<InterviewAnswer, UUID> {

    List<InterviewAnswer> findByQuestionIdAndDeletedAtIsNull(UUID questionId);
}
