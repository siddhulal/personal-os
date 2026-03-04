package com.lifeos.api.repository;

import com.lifeos.api.entity.Idea;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface IdeaRepository extends JpaRepository<Idea, UUID> {

    Page<Idea> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);

    @Query("SELECT i FROM Idea i WHERE i.user.id = :userId AND i.deletedAt IS NULL " +
           "AND (LOWER(i.title) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(i.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Idea> search(@Param("userId") UUID userId, @Param("query") String query);
}
