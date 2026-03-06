package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TagRepository tagRepository;

    public PageResponse<ProjectResponse> getAllProjects(Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<Project> page = projectRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        return toPageResponse(page);
    }

    public ProjectResponse getProject(UUID id) {
        Project project = findProjectByIdAndUser(id);
        return mapToResponse(project);
    }

    @Transactional
    public ProjectResponse createProject(ProjectRequest request) {
        User user = getCurrentUser();
        Project project = new Project();
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        project.setStatus(request.getStatus() != null ? Project.Status.valueOf(request.getStatus()) : Project.Status.ACTIVE);
        project.setStartDate(request.getStartDate());
        project.setTargetDate(request.getTargetDate());
        project.setUser(user);

        if (request.getTagIds() != null && !request.getTagIds().isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), user.getId()));
            project.setTags(tags);
        }

        project = projectRepository.save(project);
        return mapToResponse(project);
    }

    @Transactional
    public ProjectResponse updateProject(UUID id, ProjectRequest request) {
        Project project = findProjectByIdAndUser(id);
        project.setName(request.getName());
        project.setDescription(request.getDescription());
        if (request.getStatus() != null) {
            project.setStatus(Project.Status.valueOf(request.getStatus()));
        }
        project.setStartDate(request.getStartDate());
        project.setTargetDate(request.getTargetDate());

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), getCurrentUserId()));
            project.setTags(tags);
        }

        project = projectRepository.save(project);
        return mapToResponse(project);
    }

    @Transactional
    public void deleteProject(UUID id) {
        Project project = findProjectByIdAndUser(id);
        project.softDelete();
        projectRepository.save(project);
    }

    private Project findProjectByIdAndUser(UUID id) {
        Project project = projectRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Project", "id", id));
        if (!project.getUser().getId().equals(getCurrentUserId()) || project.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Project", "id", id);
        }
        return project;
    }

    private ProjectResponse mapToResponse(Project project) {
        List<Task> activeTasks = project.getTasks() != null
            ? project.getTasks().stream().filter(t -> t.getDeletedAt() == null).collect(Collectors.toList())
            : List.of();
        int taskCount = activeTasks.size();
        int completedTaskCount = (int) activeTasks.stream()
            .filter(t -> t.getStatus() == Task.Status.DONE)
            .count();
        int noteCount = project.getNotes() != null
            ? (int) project.getNotes().stream().filter(n -> n.getDeletedAt() == null).count()
            : 0;

        List<TagResponse> tagResponses = project.getTags() != null
            ? project.getTags().stream()
                .map(tag -> TagResponse.builder().id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                .collect(Collectors.toList())
            : List.of();

        return ProjectResponse.builder()
            .id(project.getId())
            .name(project.getName())
            .description(project.getDescription())
            .status(project.getStatus().name())
            .startDate(project.getStartDate())
            .targetDate(project.getTargetDate())
            .tags(tagResponses)
            .taskCount(taskCount)
            .completedTaskCount(completedTaskCount)
            .noteCount(noteCount)
            .createdAt(project.getCreatedAt())
            .updatedAt(project.getUpdatedAt())
            .build();
    }

    private PageResponse<ProjectResponse> toPageResponse(Page<Project> page) {
        return PageResponse.<ProjectResponse>builder()
            .content(page.getContent().stream().map(this::mapToResponse).collect(Collectors.toList()))
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
