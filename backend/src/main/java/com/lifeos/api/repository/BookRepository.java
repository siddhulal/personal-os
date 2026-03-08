package com.lifeos.api.repository;

import com.lifeos.api.entity.Book;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface BookRepository extends JpaRepository<Book, UUID> {

    Page<Book> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    Page<Book> findByUserIdAndStatusAndDeletedAtIsNull(UUID userId, Book.Status status, Pageable pageable);

    Page<Book> findByUserIdAndCategoryAndDeletedAtIsNull(UUID userId, String category, Pageable pageable);

    @Query("SELECT b FROM Book b WHERE b.user.id = :userId AND b.deletedAt IS NULL " +
           "AND (LOWER(b.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(b.author) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Book> search(@Param("userId") UUID userId, @Param("query") String query, Pageable pageable);

    long countByUserIdAndDeletedAtIsNull(UUID userId);

    long countByUserIdAndStatusAndDeletedAtIsNull(UUID userId, Book.Status status);

    @Query("SELECT COALESCE(SUM(b.currentPage), 0) FROM Book b WHERE b.user.id = :userId AND b.deletedAt IS NULL")
    long sumCurrentPagesByUserId(@Param("userId") UUID userId);

    List<Book> findByUserIdAndDeletedAtIsNullOrderByUpdatedAtDesc(UUID userId);
}
