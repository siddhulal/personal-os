package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiGenerateRequest {
    private String action;
    private String selectedText;
    private String context;
    private String diagramType;
    private String category;
    private String difficulty;
    private Integer count;
}
