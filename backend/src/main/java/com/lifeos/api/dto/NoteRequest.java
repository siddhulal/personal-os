package com.lifeos.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NoteRequest {

    @NotBlank(message = "Title is required")
    private String title;

    private String content;

    private String contentJson;

    private UUID projectId;

    private UUID notebookId;

    private UUID sectionId;

    private Integer orderIndex;

    private List<UUID> tagIds;
}
