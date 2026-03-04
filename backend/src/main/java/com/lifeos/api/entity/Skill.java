package com.lifeos.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true, exclude = {"user", "tags"})
@Entity
@Table(name = "skills")
public class Skill extends BaseEntity {

    public enum Level {
        BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    }

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Level level;

    @Min(1)
    @Max(10)
    @Column(name = "confidence_score", nullable = false)
    private int confidenceScore;

    @Column(name = "last_practiced")
    private LocalDate lastPracticed;

    @Column(length = 100)
    private String category;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "skill_tags",
            joinColumns = @JoinColumn(name = "skill_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id")
    )
    private Set<Tag> tags = new HashSet<>();
}
