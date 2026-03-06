package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CanvasNodeRequest {

    private String canvasId;
    private UUID noteId;
    private String label;
    private String content;
    private double x;
    private double y;
    private double width;
    private double height;
    private String color;
    private String nodeType;
}
