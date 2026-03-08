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
public class BookHighlightResponse {
    private UUID id;
    private UUID bookId;
    private Integer pageNumber;
    private String selectedText;
    private String aiResponse;
    private String aiActionType;
    private String color;
    private String note;
    private UUID linkedNoteId;
    private LocalDateTime createdAt;
}
