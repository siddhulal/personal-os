package com.lifeos.api.repository;

import com.lifeos.api.entity.BookHighlight;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookHighlightRepository extends JpaRepository<BookHighlight, UUID> {

    List<BookHighlight> findByBookIdAndDeletedAtIsNullOrderByPageNumberAscCreatedAtAsc(UUID bookId);

    List<BookHighlight> findByBookIdAndPageNumberAndDeletedAtIsNull(UUID bookId, Integer pageNumber);

    long countByBookIdAndDeletedAtIsNull(UUID bookId);
}
