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
public class CanvasEdgeResponse {

    private UUID id;
    private String canvasId;
    private UUID sourceNodeId;
    private UUID targetNodeId;
    private String label;
    private String edgeType;
    private String sourceHandle;
    private String targetHandle;
}
