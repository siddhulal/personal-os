package com.lifeos.api.repository;

import com.lifeos.api.entity.Skill;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface SkillRepository extends JpaRepository<Skill, UUID> {

    Page<Skill> findByUserIdAndDeletedAtIsNull(UUID userId, Pageable pageable);
}
