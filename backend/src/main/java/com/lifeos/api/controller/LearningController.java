package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.LearningService;
import com.lifeos.api.service.SkillService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/learning")
@RequiredArgsConstructor
public class LearningController {

    private final LearningService learningService;
    private final SkillService skillService;

    // Roadmaps
    @GetMapping("/roadmaps")
    public ResponseEntity<PageResponse<RoadmapResponse>> getAllRoadmaps(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(learningService.getAllRoadmaps(pageable));
    }

    @GetMapping("/roadmaps/{id}")
    public ResponseEntity<RoadmapResponse> getRoadmap(@PathVariable UUID id) {
        return ResponseEntity.ok(learningService.getRoadmap(id));
    }

    @PostMapping("/roadmaps")
    public ResponseEntity<RoadmapResponse> createRoadmap(@Valid @RequestBody RoadmapRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(learningService.createRoadmap(request));
    }

    @PutMapping("/roadmaps/{id}")
    public ResponseEntity<RoadmapResponse> updateRoadmap(@PathVariable UUID id, @Valid @RequestBody RoadmapRequest request) {
        return ResponseEntity.ok(learningService.updateRoadmap(id, request));
    }

    @DeleteMapping("/roadmaps/{id}")
    public ResponseEntity<Void> deleteRoadmap(@PathVariable UUID id) {
        learningService.deleteRoadmap(id);
        return ResponseEntity.noContent().build();
    }

    // Topics
    @PostMapping("/roadmaps/{roadmapId}/topics")
    public ResponseEntity<TopicResponse> addTopic(@PathVariable UUID roadmapId, @Valid @RequestBody TopicRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(learningService.addTopic(roadmapId, request));
    }

    @PutMapping("/topics/{id}")
    public ResponseEntity<TopicResponse> updateTopic(@PathVariable UUID id, @Valid @RequestBody TopicRequest request) {
        return ResponseEntity.ok(learningService.updateTopic(id, request));
    }

    @DeleteMapping("/topics/{id}")
    public ResponseEntity<Void> deleteTopic(@PathVariable UUID id) {
        learningService.deleteTopic(id);
        return ResponseEntity.noContent().build();
    }

    // Skills
    @GetMapping("/skills")
    public ResponseEntity<PageResponse<SkillResponse>> getAllSkills(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(skillService.getAllSkills(pageable));
    }

    @PostMapping("/skills")
    public ResponseEntity<SkillResponse> createSkill(@Valid @RequestBody SkillRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(skillService.createSkill(request));
    }

    @PutMapping("/skills/{id}")
    public ResponseEntity<SkillResponse> updateSkill(@PathVariable UUID id, @Valid @RequestBody SkillRequest request) {
        return ResponseEntity.ok(skillService.updateSkill(id, request));
    }

    @DeleteMapping("/skills/{id}")
    public ResponseEntity<Void> deleteSkill(@PathVariable UUID id) {
        skillService.deleteSkill(id);
        return ResponseEntity.noContent().build();
    }
}
