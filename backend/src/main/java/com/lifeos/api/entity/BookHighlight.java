package com.lifeos.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true, exclude = {"book", "user"})
@Entity
@Table(name = "book_highlights")
public class BookHighlight extends BaseEntity {

    public enum ActionType {
        EXPLAIN, CODE, DIAGRAM, INTERVIEW, CUSTOM
    }

    @Column(name = "page_number", nullable = false)
    private Integer pageNumber;

    @Column(name = "selected_text", nullable = false, columnDefinition = "TEXT")
    private String selectedText;

    @Column(name = "ai_response", columnDefinition = "TEXT")
    private String aiResponse;

    @Enumerated(EnumType.STRING)
    @Column(name = "ai_action_type")
    private ActionType aiActionType;

    @Column(length = 20)
    private String color;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column(name = "linked_note_id")
    private UUID linkedNoteId;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "book_id", nullable = false)
    private Book book;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
