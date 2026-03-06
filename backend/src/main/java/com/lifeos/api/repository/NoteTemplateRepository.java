package com.lifeos.api.repository;

import com.lifeos.api.entity.NoteTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NoteTemplateRepository extends JpaRepository<NoteTemplate, UUID> {

    List<NoteTemplate> findByUserIdOrderByNameAsc(UUID userId);

    List<NoteTemplate> findByUserIdAndCategory(UUID userId, String category);
}
