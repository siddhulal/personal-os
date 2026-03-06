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
public class NoteVersionResponse {

    private UUID id;
    private UUID noteId;
    private String title;
    private String content;
    private String contentJson;
    private int versionNumber;
    private LocalDateTime createdAt;
}
