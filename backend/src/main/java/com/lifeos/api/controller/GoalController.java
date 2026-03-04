package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.GoalService;
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
@RequestMapping("/api/goals")
@RequiredArgsConstructor
public class GoalController {

    private final GoalService goalService;

    @GetMapping
    public ResponseEntity<PageResponse<GoalResponse>> getAllGoals(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(goalService.getAllGoals(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GoalResponse> getGoal(@PathVariable UUID id) {
        return ResponseEntity.ok(goalService.getGoal(id));
    }

    @PostMapping
    public ResponseEntity<GoalResponse> createGoal(@Valid @RequestBody GoalRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(goalService.createGoal(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GoalResponse> updateGoal(@PathVariable UUID id, @Valid @RequestBody GoalRequest request) {
        return ResponseEntity.ok(goalService.updateGoal(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable UUID id) {
        goalService.deleteGoal(id);
        return ResponseEntity.noContent().build();
    }
}
