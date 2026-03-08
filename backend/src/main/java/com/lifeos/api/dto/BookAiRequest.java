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
public class BookAiRequest {
    @NotBlank(message = "Selected text is required")
    private String selectedText;

    @NotNull(message = "Page number is required")
    private Integer pageNumber;

    @NotBlank(message = "Action type is required")
    private String actionType; // EXPLAIN, CODE, DIAGRAM, INTERVIEW, ASK

    private String question;   // for ASK type
    private String language;   // preferred code language for CODE type
}
