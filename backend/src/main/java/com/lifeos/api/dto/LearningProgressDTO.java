package com.lifeos.api.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningProgressDTO {

    private int totalTopics;
    private int completedTopics;
    private double progressPercentage;
    private int totalSkills;
    private int studySessionsThisWeek;
}
