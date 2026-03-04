package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class InterviewService {

    private final InterviewQuestionRepository questionRepository;
    private final InterviewAnswerRepository answerRepository;
    private final PracticeRecordRepository practiceRecordRepository;
    private final TagRepository tagRepository;

    // --- Question CRUD ---

    public PageResponse<InterviewQuestionResponse> getAllQuestions(Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<InterviewQuestion> page = questionRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        return toPageResponse(page);
    }

    public InterviewQuestionResponse getQuestion(UUID id) {
        InterviewQuestion question = findQuestionByIdAndUser(id);
        return mapToQuestionResponse(question);
    }

    @Transactional
    public InterviewQuestionResponse createQuestion(InterviewQuestionRequest request) {
        User user = getCurrentUser();
        InterviewQuestion question = new InterviewQuestion();
        question.setQuestionText(request.getQuestionText());
        question.setCategory(request.getCategory());
        question.setDifficulty(request.getDifficulty() != null
            ? InterviewQuestion.Difficulty.valueOf(request.getDifficulty())
            : InterviewQuestion.Difficulty.MEDIUM);
        question.setUser(user);

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), user.getId()));
            question.setTags(tags);
        }

        question = questionRepository.save(question);
        return mapToQuestionResponse(question);
    }

    @Transactional
    public InterviewQuestionResponse updateQuestion(UUID id, InterviewQuestionRequest request) {
        InterviewQuestion question = findQuestionByIdAndUser(id);
        question.setQuestionText(request.getQuestionText());
        question.setCategory(request.getCategory());
        if (request.getDifficulty() != null) {
            question.setDifficulty(InterviewQuestion.Difficulty.valueOf(request.getDifficulty()));
        }

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), getCurrentUserId()));
            question.setTags(tags);
        }

        question = questionRepository.save(question);
        return mapToQuestionResponse(question);
    }

    @Transactional
    public void deleteQuestion(UUID id) {
        InterviewQuestion question = findQuestionByIdAndUser(id);
        question.softDelete();
        questionRepository.save(question);
    }

    // --- Answer operations ---

    @Transactional
    public InterviewAnswerResponse addAnswer(UUID questionId, InterviewAnswerRequest request) {
        InterviewQuestion question = findQuestionByIdAndUser(questionId);
        User user = getCurrentUser();

        InterviewAnswer answer = new InterviewAnswer();
        answer.setAnswerText(request.getAnswerText());
        answer.setKeyPoints(request.getKeyPoints());
        answer.setExampleScenarios(request.getExampleScenarios());
        answer.setMistakesToAvoid(request.getMistakesToAvoid());
        answer.setQuestion(question);
        answer.setUser(user);

        answer = answerRepository.save(answer);
        return mapToAnswerResponse(answer);
    }

    @Transactional
    public InterviewAnswerResponse updateAnswer(UUID questionId, UUID answerId, InterviewAnswerRequest request) {
        findQuestionByIdAndUser(questionId);
        InterviewAnswer answer = answerRepository.findById(answerId)
            .orElseThrow(() -> new ResourceNotFoundException("InterviewAnswer", "id", answerId));

        if (!answer.getQuestion().getId().equals(questionId) || answer.getDeletedAt() != null) {
            throw new ResourceNotFoundException("InterviewAnswer", "id", answerId);
        }

        answer.setAnswerText(request.getAnswerText());
        answer.setKeyPoints(request.getKeyPoints());
        answer.setExampleScenarios(request.getExampleScenarios());
        answer.setMistakesToAvoid(request.getMistakesToAvoid());

        answer = answerRepository.save(answer);
        return mapToAnswerResponse(answer);
    }

    // --- Practice session ---

    @Transactional
    public PracticeRecordResponse recordPractice(UUID questionId, PracticeRecordRequest request) {
        InterviewQuestion question = findQuestionByIdAndUser(questionId);
        User user = getCurrentUser();

        PracticeRecord record = new PracticeRecord();
        record.setPracticedAt(LocalDateTime.now());
        record.setConfidenceScore(request.getConfidenceScore());
        record.setSelfRating(request.getSelfRating() != null ? request.getSelfRating() : 3);
        record.setNotes(request.getNotes());
        record.setTimeTakenSeconds(request.getTimeTakenSeconds() != null ? request.getTimeTakenSeconds() : 0);
        record.setQuestion(question);
        record.setUser(user);

        record = practiceRecordRepository.save(record);
        return mapToPracticeRecordResponse(record);
    }

    // --- Random question ---

    public InterviewQuestionResponse getRandomQuestion() {
        UUID userId = getCurrentUserId();
        Page<InterviewQuestion> page = questionRepository.findRandomQuestion(userId, PageRequest.of(0, 1));
        if (page.isEmpty()) {
            throw new ResourceNotFoundException("InterviewQuestion", "random", "none available");
        }
        return mapToQuestionResponse(page.getContent().get(0));
    }

    // --- Interview progress ---

    public InterviewProgressDTO getInterviewProgress() {
        UUID userId = getCurrentUserId();

        Page<InterviewQuestion> allQuestions = questionRepository.findByUserIdAndDeletedAtIsNull(userId, PageRequest.of(0, 1000));
        int totalQuestions = (int) allQuestions.getTotalElements();

        int masteredQuestions = 0;
        Map<String, Integer> topicProgress = new HashMap<>();

        for (InterviewQuestion question : allQuestions.getContent()) {
            int practiceCount = practiceRecordRepository.countByQuestionIdAndUserIdAndDeletedAtIsNull(question.getId(), userId);
            Optional<PracticeRecord> lastRecord = practiceRecordRepository
                .findTopByQuestionIdAndUserIdOrderByPracticedAtDesc(question.getId(), userId);

            String practiceStatus = calculatePracticeStatus(practiceCount, lastRecord);
            if ("MASTERED".equals(practiceStatus)) {
                masteredQuestions++;
            }

            // Aggregate by category
            String category = question.getCategory();
            topicProgress.merge(category, 1, Integer::sum);
        }

        LocalDate today = LocalDate.now();
        LocalDateTime weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)).atStartOfDay();
        int practicedThisWeek = (int) practiceRecordRepository.countPracticedThisWeek(userId, weekStart);

        return InterviewProgressDTO.builder()
            .totalQuestions(totalQuestions)
            .masteredQuestions(masteredQuestions)
            .practicedThisWeek(practicedThisWeek)
            .topicProgress(topicProgress)
            .build();
    }

    // --- Private helpers ---

    private String calculatePracticeStatus(int practiceCount, Optional<PracticeRecord> lastRecord) {
        if (practiceCount == 0) {
            return "NEEDS_WORK";
        }
        if (lastRecord.isPresent() && lastRecord.get().getConfidenceScore() >= 8) {
            return "MASTERED";
        }
        return "PRACTICING";
    }

    private InterviewQuestion findQuestionByIdAndUser(UUID id) {
        InterviewQuestion question = questionRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("InterviewQuestion", "id", id));
        if (!question.getUser().getId().equals(getCurrentUserId()) || question.getDeletedAt() != null) {
            throw new ResourceNotFoundException("InterviewQuestion", "id", id);
        }
        return question;
    }

    private InterviewQuestionResponse mapToQuestionResponse(InterviewQuestion question) {
        UUID userId = getCurrentUserId();
        int practiceCount = practiceRecordRepository.countByQuestionIdAndUserIdAndDeletedAtIsNull(question.getId(), userId);
        Optional<PracticeRecord> lastRecord = practiceRecordRepository
            .findTopByQuestionIdAndUserIdOrderByPracticedAtDesc(question.getId(), userId);

        Integer lastConfidenceScore = lastRecord.map(PracticeRecord::getConfidenceScore).orElse(null);
        String practiceStatus = calculatePracticeStatus(practiceCount, lastRecord);

        List<InterviewAnswerResponse> answerResponses = List.of();
        if (question.getAnswers() != null) {
            answerResponses = question.getAnswers().stream()
                .filter(a -> a.getDeletedAt() == null)
                .map(this::mapToAnswerResponse)
                .collect(Collectors.toList());
        }

        return InterviewQuestionResponse.builder()
            .id(question.getId())
            .questionText(question.getQuestionText())
            .category(question.getCategory())
            .difficulty(question.getDifficulty().name())
            .tags(question.getTags() != null ? question.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .answers(answerResponses)
            .practiceCount(practiceCount)
            .lastConfidenceScore(lastConfidenceScore)
            .practiceStatus(practiceStatus)
            .createdAt(question.getCreatedAt())
            .updatedAt(question.getUpdatedAt())
            .build();
    }

    private InterviewAnswerResponse mapToAnswerResponse(InterviewAnswer answer) {
        return InterviewAnswerResponse.builder()
            .id(answer.getId())
            .answerText(answer.getAnswerText())
            .keyPoints(answer.getKeyPoints())
            .exampleScenarios(answer.getExampleScenarios())
            .mistakesToAvoid(answer.getMistakesToAvoid())
            .createdAt(answer.getCreatedAt())
            .updatedAt(answer.getUpdatedAt())
            .build();
    }

    private PracticeRecordResponse mapToPracticeRecordResponse(PracticeRecord record) {
        return PracticeRecordResponse.builder()
            .id(record.getId())
            .practicedAt(record.getPracticedAt())
            .confidenceScore(record.getConfidenceScore())
            .selfRating(record.getSelfRating())
            .notes(record.getNotes())
            .timeTakenSeconds(record.getTimeTakenSeconds())
            .questionId(record.getQuestion().getId())
            .createdAt(record.getCreatedAt())
            .build();
    }

    private PageResponse<InterviewQuestionResponse> toPageResponse(Page<InterviewQuestion> page) {
        return PageResponse.<InterviewQuestionResponse>builder()
            .content(page.getContent().stream().map(this::mapToQuestionResponse).collect(Collectors.toList()))
            .page(page.getNumber())
            .size(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .last(page.isLast())
            .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
