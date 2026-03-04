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

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true, exclude = {"question", "user"})
@Entity
@Table(name = "practice_records")
public class PracticeRecord extends BaseEntity {

    @Column(name = "practiced_at", nullable = false)
    private LocalDateTime practicedAt;

    @Min(1)
    @Max(10)
    @Column(name = "confidence_score", nullable = false)
    private int confidenceScore;

    @Min(1)
    @Max(5)
    @Column(name = "self_rating", nullable = false)
    private int selfRating;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "time_taken_seconds")
    private int timeTakenSeconds;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private InterviewQuestion question;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
