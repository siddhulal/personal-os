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
public class NoteTemplateResponse {

    private UUID id;
    private String name;
    private String description;
    private String content;
    private String contentJson;
    private String category;
    private String icon;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
