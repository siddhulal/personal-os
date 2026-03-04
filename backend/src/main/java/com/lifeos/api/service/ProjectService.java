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

import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectService {

    private final ProjectRepository projectRepository;

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
        project.setUser(user);

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
        int taskCount = project.getTasks() != null
            ? (int) project.getTasks().stream().filter(t -> t.getDeletedAt() == null).count()
            : 0;
        int noteCount = project.getNotes() != null
            ? (int) project.getNotes().stream().filter(n -> n.getDeletedAt() == null).count()
            : 0;

        return ProjectResponse.builder()
            .id(project.getId())
            .name(project.getName())
            .description(project.getDescription())
            .status(project.getStatus().name())
            .taskCount(taskCount)
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
