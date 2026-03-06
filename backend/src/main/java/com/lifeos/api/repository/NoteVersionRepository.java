package com.lifeos.api.repository;

import com.lifeos.api.entity.NoteVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteVersionRepository extends JpaRepository<NoteVersion, UUID> {

    List<NoteVersion> findByNoteIdOrderByVersionNumberDesc(UUID noteId);

    Optional<NoteVersion> findTopByNoteIdOrderByVersionNumberDesc(UUID noteId);

    int countByNoteId(UUID noteId);
}
