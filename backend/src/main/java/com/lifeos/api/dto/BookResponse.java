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
public class BookResponse {
    private UUID id;
    private String title;
    private String author;
    private String description;
    private String coverImageUrl;
    private String fileUrl;
    private String fileType;
    private Long fileSize;
    private Integer totalPages;
    private Integer currentPage;
    private String status;
    private String category;
    private Integer rating;
    private LocalDateTime startedAt;
    private LocalDateTime finishedAt;
    private List<TagResponse> tags;
    private int highlightCount;
    private int bookmarkCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
