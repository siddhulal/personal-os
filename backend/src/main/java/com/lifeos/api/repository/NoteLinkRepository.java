package com.lifeos.api.repository;

import com.lifeos.api.entity.NoteLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteLinkRepository extends JpaRepository<NoteLink, UUID> {

    List<NoteLink> findBySourceNoteIdAndUserId(UUID sourceNoteId, UUID userId);

    List<NoteLink> findByTargetNoteIdAndUserId(UUID targetNoteId, UUID userId);

    List<NoteLink> findByUserId(UUID userId);

    Optional<NoteLink> findBySourceNoteIdAndTargetNoteIdAndUserId(UUID sourceNoteId, UUID targetNoteId, UUID userId);

    void deleteBySourceNoteIdAndTargetNoteIdAndUserId(UUID sourceNoteId, UUID targetNoteId, UUID userId);
}
