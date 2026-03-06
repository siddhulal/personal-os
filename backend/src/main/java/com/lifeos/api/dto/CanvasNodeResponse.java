package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CanvasNodeResponse {

    private UUID id;
    private String canvasId;
    private UUID noteId;
    private String noteTitle;
    private String label;
    private String content;
    private double x;
    private double y;
    private double width;
    private double height;
    private String color;
    private String nodeType;
    private LocalDateTime createdAt;
}
