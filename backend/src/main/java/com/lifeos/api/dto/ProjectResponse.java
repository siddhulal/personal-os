package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {

    private UUID id;
    private String name;
    private String description;
    private String status;
    private LocalDate startDate;
    private LocalDate targetDate;
    private List<TagResponse> tags;
    private int taskCount;
    private int completedTaskCount;
    private int noteCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
