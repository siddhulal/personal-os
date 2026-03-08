package com.lifeos.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookHighlightRequest {
    @NotNull(message = "Page number is required")
    private Integer pageNumber;

    @NotBlank(message = "Selected text is required")
    private String selectedText;

    private String aiResponse;
    private String aiActionType;
    private String color;
    private String note;
}
