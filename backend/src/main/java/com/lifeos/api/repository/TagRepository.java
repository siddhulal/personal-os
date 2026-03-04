package com.lifeos.api.repository;

import com.lifeos.api.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TagRepository extends JpaRepository<Tag, UUID> {

    List<Tag> findByUserIdAndDeletedAtIsNull(UUID userId);

    List<Tag> findByIdInAndUserId(List<UUID> ids, UUID userId);

    boolean existsByNameAndUserId(String name, UUID userId);
}
