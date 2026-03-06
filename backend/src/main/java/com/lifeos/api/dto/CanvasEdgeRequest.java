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
public class CanvasEdgeRequest {

    private String canvasId;
    private UUID sourceNodeId;
    private UUID targetNodeId;
    private String label;
}
