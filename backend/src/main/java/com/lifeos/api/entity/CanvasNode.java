package com.lifeos.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true, exclude = {"user", "note"})
@Entity
@Table(name = "canvas_nodes")
public class CanvasNode extends BaseEntity {
    @Column(name = "canvas_id", nullable = false)
    private String canvasId;

    @Column(length = 500)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false)
    private double x;

    @Column(nullable = false)
    private double y;

    @Column(nullable = false)
    private double width;

    @Column(nullable = false)
    private double height;

    @Column(length = 50)
    private String color;

    @Column(name = "node_type", length = 50, nullable = false)
    private String nodeType;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "note_id")
    private Note note;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
