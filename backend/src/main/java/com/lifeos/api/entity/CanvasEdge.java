package com.lifeos.api.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true, exclude = {"user", "sourceNode", "targetNode"})
@Entity
@Table(name = "canvas_edges")
public class CanvasEdge extends BaseEntity {
    @Column(name = "canvas_id", nullable = false)
    private String canvasId;

    @Column(length = 255)
    private String label;

    @Column(name = "edge_type", length = 50)
    private String edgeType = "solid";

    @Column(name = "source_handle", length = 50)
    private String sourceHandle;

    @Column(name = "target_handle", length = 50)
    private String targetHandle;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_node_id", nullable = false)
    private CanvasNode sourceNode;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_node_id", nullable = false)
    private CanvasNode targetNode;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
