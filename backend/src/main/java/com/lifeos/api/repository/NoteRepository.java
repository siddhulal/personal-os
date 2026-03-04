package com.lifeos.api.repository;

import com.lifeos.api.entity.Note;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NoteRepository extends JpaRepository<Note, UUID> {

    Page<Note> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    Page<Note> findByUserIdAndProjectIdAndDeletedAtIsNull(UUID userId, UUID projectId, Pageable pageable);

    List<Note> findBySectionIdAndDeletedAtIsNullOrderByOrderIndexAsc(UUID sectionId);

    @Query("SELECT n FROM Note n WHERE n.user.id = :userId AND n.deletedAt IS NULL " +
           "AND (LOWER(n.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(n.content) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Note> search(@Param("userId") UUID userId, @Param("query") String query);

    int countByUserIdAndProjectIdAndDeletedAtIsNull(UUID userId, UUID projectId);

    int countBySectionIdAndDeletedAtIsNull(UUID sectionId);

    Optional<Note> findByUserIdAndDailyNoteDateAndDeletedAtIsNull(UUID userId, LocalDate date);

    @Query("SELECT n FROM Note n WHERE n.user.id = :userId AND n.deletedAt IS NULL " +
           "AND LOWER(n.title) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY n.updatedAt DESC")
    List<Note> suggestByTitle(@Param("userId") UUID userId, @Param("query") String query);
}
