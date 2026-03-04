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
public class SectionResponse {

    private UUID id;
    private String name;
    private int orderIndex;
    private UUID notebookId;
    private int pageCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
