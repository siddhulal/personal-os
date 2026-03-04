package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final TaskRepository taskRepository;
    private final NoteRepository noteRepository;
    private final IdeaRepository ideaRepository;
    private final InterviewQuestionRepository interviewQuestionRepository;

    public SearchResponse search(String query) {
        UUID userId = getCurrentUserId();

        List<Task> tasks = taskRepository.search(userId, query);
        List<Note> notes = noteRepository.search(userId, query);
        List<Idea> ideas = ideaRepository.search(userId, query);
        List<InterviewQuestion> questions = interviewQuestionRepository.search(userId, query);

        return SearchResponse.builder()
            .tasks(tasks.stream()
                .limit(10)
                .map(this::mapTaskResponse)
                .collect(Collectors.toList()))
            .notes(notes.stream()
                .limit(10)
                .map(this::mapNoteResponse)
                .collect(Collectors.toList()))
            .ideas(ideas.stream()
                .limit(10)
                .map(this::mapIdeaResponse)
                .collect(Collectors.toList()))
            .questions(questions.stream()
                .limit(10)
                .map(this::mapQuestionResponse)
                .collect(Collectors.toList()))
            .build();
    }

    private TaskResponse mapTaskResponse(Task task) {
        return TaskResponse.builder()
            .id(task.getId())
            .title(task.getTitle())
            .description(task.getDescription())
            .status(task.getStatus().name())
            .priority(task.getPriority().name())
            .dueDate(task.getDueDate())
            .projectId(task.getProject() != null ? task.getProject().getId() : null)
            .projectName(task.getProject() != null ? task.getProject().getName() : null)
            .tags(task.getTags() != null ? task.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .createdAt(task.getCreatedAt())
            .updatedAt(task.getUpdatedAt())
            .build();
    }

    private NoteResponse mapNoteResponse(Note note) {
        return NoteResponse.builder()
            .id(note.getId())
            .title(note.getTitle())
            .content(note.getContent())
            .projectId(note.getProject() != null ? note.getProject().getId() : null)
            .projectName(note.getProject() != null ? note.getProject().getName() : null)
            .tags(note.getTags() != null ? note.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .createdAt(note.getCreatedAt())
            .updatedAt(note.getUpdatedAt())
            .build();
    }

    private IdeaResponse mapIdeaResponse(Idea idea) {
        return IdeaResponse.builder()
            .id(idea.getId())
            .title(idea.getTitle())
            .description(idea.getDescription())
            .tags(idea.getTags() != null ? idea.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .createdAt(idea.getCreatedAt())
            .updatedAt(idea.getUpdatedAt())
            .build();
    }

    private InterviewQuestionResponse mapQuestionResponse(InterviewQuestion question) {
        return InterviewQuestionResponse.builder()
            .id(question.getId())
            .questionText(question.getQuestionText())
            .category(question.getCategory())
            .difficulty(question.getDifficulty().name())
            .tags(question.getTags() != null ? question.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList()) : List.of())
            .answers(List.of())
            .practiceCount(0)
            .lastConfidenceScore(null)
            .practiceStatus("NEEDS_WORK")
            .createdAt(question.getCreatedAt())
            .updatedAt(question.getUpdatedAt())
            .build();
    }

    private UUID getCurrentUserId() {
        return ((User) SecurityContextHolder.getContext().getAuthentication().getPrincipal()).getId();
    }
}
