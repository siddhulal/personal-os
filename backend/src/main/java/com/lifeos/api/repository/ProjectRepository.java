package com.lifeos.api.repository;

import com.lifeos.api.entity.Project;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {

    Page<Project> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    Page<Project> findByUserIdAndStatusAndDeletedAtIsNull(UUID userId, Project.Status status, Pageable pageable);
}
