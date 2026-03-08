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
public class BookBookmarkResponse {
    private UUID id;
    private UUID bookId;
    private Integer pageNumber;
    private String label;
    private LocalDateTime createdAt;
}
