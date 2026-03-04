package com.lifeos.api.repository;

import com.lifeos.api.entity.Notebook;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotebookRepository extends JpaRepository<Notebook, UUID> {

    List<Notebook> findByUserIdAndDeletedAtIsNullOrderByOrderIndexAsc(UUID userId);
}
