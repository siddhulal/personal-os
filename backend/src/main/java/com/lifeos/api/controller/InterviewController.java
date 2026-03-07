package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.InterviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/interview")
@RequiredArgsConstructor
public class InterviewController {

    private final InterviewService interviewService;

    @GetMapping("/questions")
    public ResponseEntity<PageResponse<InterviewQuestionResponse>> getAllQuestions(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(interviewService.getAllQuestions(pageable));
    }

    @GetMapping("/questions/{id}")
    public ResponseEntity<InterviewQuestionResponse> getQuestion(@PathVariable UUID id) {
        return ResponseEntity.ok(interviewService.getQuestion(id));
    }

    @PostMapping("/questions")
    public ResponseEntity<InterviewQuestionResponse> createQuestion(@Valid @RequestBody InterviewQuestionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(interviewService.createQuestion(request));
    }

    @PutMapping("/questions/{id}")
    public ResponseEntity<InterviewQuestionResponse> updateQuestion(@PathVariable UUID id, @Valid @RequestBody InterviewQuestionRequest request) {
        return ResponseEntity.ok(interviewService.updateQuestion(id, request));
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable UUID id) {
        interviewService.deleteQuestion(id);
        return ResponseEntity.noContent().build();
    }

    // Answers
    @PostMapping("/questions/{questionId}/answers")
    public ResponseEntity<InterviewAnswerResponse> addAnswer(
            @PathVariable UUID questionId, @Valid @RequestBody InterviewAnswerRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(interviewService.addAnswer(questionId, request));
    }

    @PutMapping("/questions/{questionId}/answers/{id}")
    public ResponseEntity<InterviewAnswerResponse> updateAnswer(
            @PathVariable UUID questionId, @PathVariable UUID id, @Valid @RequestBody InterviewAnswerRequest request) {
        return ResponseEntity.ok(interviewService.updateAnswer(questionId, id, request));
    }

    @DeleteMapping("/questions/{questionId}/answers/{id}")
    public ResponseEntity<Void> deleteAnswer(@PathVariable UUID questionId, @PathVariable UUID id) {
        interviewService.deleteAnswer(questionId, id);
        return ResponseEntity.noContent().build();
    }

    // Practice
    @PostMapping("/questions/{questionId}/practice")
    public ResponseEntity<PracticeRecordResponse> recordPractice(
            @PathVariable UUID questionId, @Valid @RequestBody PracticeRecordRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(interviewService.recordPractice(questionId, request));
    }

    // Random question for mock interview
    @GetMapping("/questions/random")
    public ResponseEntity<InterviewQuestionResponse> getRandomQuestion() {
        return ResponseEntity.ok(interviewService.getRandomQuestion());
    }

    // Progress
    @GetMapping("/progress")
    public ResponseEntity<InterviewProgressDTO> getProgress() {
        return ResponseEntity.ok(interviewService.getInterviewProgress());
    }
}
