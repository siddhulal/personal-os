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
public class CrossModuleLinkResponse {

    private UUID id;
    private String sourceType;
    private UUID sourceId;
    private String sourceTitle;
    private String targetType;
    private UUID targetId;
    private String targetTitle;
    private String linkType;
    private LocalDateTime createdAt;
}
