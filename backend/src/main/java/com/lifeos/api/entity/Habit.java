package com.lifeos.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true, exclude = {"user"})
@Entity
@Table(name = "habits")
public class Habit extends BaseEntity {

    public enum Frequency {
        DAILY, WEEKLY, CUSTOM
    }

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Frequency frequency;

    @Column(name = "frequency_days", columnDefinition = "INTEGER[]")
    private Integer[] frequencyDays;

    private String category;

    @Column(length = 30)
    private String color;

    @Column(length = 50)
    private String icon;

    @Column(name = "is_micro_habit")
    private boolean isMicroHabit;

    @Column(name = "micro_habit_cue", columnDefinition = "TEXT")
    private String microHabitCue;

    @Column(name = "reminder_time")
    private LocalTime reminderTime;

    @Column(name = "target_count")
    private int targetCount;

    @Column(name = "order_index")
    private int orderIndex;

    @Column(name = "archived_at")
    private LocalDateTime archivedAt;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
