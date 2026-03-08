package com.lifeos.api.repository;

import com.lifeos.api.entity.BookBookmark;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BookBookmarkRepository extends JpaRepository<BookBookmark, UUID> {

    List<BookBookmark> findByBookIdAndDeletedAtIsNullOrderByPageNumberAsc(UUID bookId);

    long countByBookIdAndDeletedAtIsNull(UUID bookId);
}
