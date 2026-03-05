package com.lifeos.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
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
@EqualsAndHashCode(callSuper = true, exclude = {"user", "note"})
@Entity
@Table(name = "flashcards")
public class Flashcard extends BaseEntity {

    @Column(nullable = false, columnDefinition = "TEXT")
    private String front;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String back;

    @Column(length = 255)
    private String deck;

    // FSRS scheduling fields
    @Column(nullable = false)
    private double stability;

    @Column(nullable = false)
    private double difficulty;

    @Column(name = "elapsed_days", nullable = false)
    private int elapsedDays;

    @Column(name = "scheduled_days", nullable = false)
    private int scheduledDays;

    @Column(nullable = false)
    private int reps;

    @Column(nullable = false)
    private int lapses;

    @Column(nullable = false)
    private int state; // 0=New, 1=Learning, 2=Review, 3=Relearning

    @Column(name = "last_review")
    private LocalDateTime lastReview;

    @Column(name = "next_review")
    private LocalDateTime nextReview;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id")
    private Note note;

    public enum State {
        NEW(0), LEARNING(1), REVIEW(2), RELEARNING(3);
        public final int value;
        State(int v) { this.value = v; }
        public static State fromValue(int v) {
            return switch (v) {
                case 1 -> LEARNING;
                case 2 -> REVIEW;
                case 3 -> RELEARNING;
                default -> NEW;
            };
        }
    }

    public enum Rating {
        AGAIN(1), HARD(2), GOOD(3), EASY(4);
        public final int value;
        Rating(int v) { this.value = v; }
    }
}
