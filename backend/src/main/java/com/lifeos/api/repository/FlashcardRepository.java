package com.lifeos.api.repository;

import com.lifeos.api.entity.Flashcard;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface FlashcardRepository extends JpaRepository<Flashcard, UUID> {

    Page<Flashcard> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    Page<Flashcard> findByUserIdAndDeckAndDeletedAtIsNull(UUID userId, String deck, Pageable pageable);

    List<Flashcard> findByNoteIdAndDeletedAtIsNull(UUID noteId);

    @Query("SELECT f FROM Flashcard f WHERE f.user.id = :userId AND f.deletedAt IS NULL " +
           "AND (f.nextReview IS NULL OR f.nextReview <= :now) ORDER BY f.nextReview ASC NULLS FIRST")
    List<Flashcard> findDueCards(@Param("userId") UUID userId, @Param("now") LocalDateTime now);

    @Query("SELECT f FROM Flashcard f WHERE f.user.id = :userId AND f.deck = :deck AND f.deletedAt IS NULL " +
           "AND (f.nextReview IS NULL OR f.nextReview <= :now) ORDER BY f.nextReview ASC NULLS FIRST")
    List<Flashcard> findDueCardsByDeck(@Param("userId") UUID userId, @Param("deck") String deck,
                                       @Param("now") LocalDateTime now);

    @Query("SELECT DISTINCT f.deck FROM Flashcard f WHERE f.user.id = :userId AND f.deletedAt IS NULL ORDER BY f.deck")
    List<String> findDistinctDecks(@Param("userId") UUID userId);

    int countByUserIdAndDeletedAtIsNull(UUID userId);

    @Query("SELECT COUNT(f) FROM Flashcard f WHERE f.user.id = :userId AND f.deletedAt IS NULL " +
           "AND (f.nextReview IS NULL OR f.nextReview <= :now)")
    int countDueCards(@Param("userId") UUID userId, @Param("now") LocalDateTime now);

    @Query("SELECT COUNT(f) FROM Flashcard f WHERE f.user.id = :userId AND f.deletedAt IS NULL AND f.state = 2")
    int countMasteredCards(@Param("userId") UUID userId);
}
