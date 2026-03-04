package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotebookResponse {

    private UUID id;
    private String name;
    private String description;
    private String color;
    private String icon;
    private int orderIndex;
    private List<SectionResponse> sections;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
