package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.HabitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/habits")
@RequiredArgsConstructor
public class HabitController {

    private final HabitService habitService;

    @GetMapping
    public ResponseEntity<List<HabitResponse>> getAllHabits() {
        return ResponseEntity.ok(habitService.getActiveHabits());
    }

    @GetMapping("/all")
    public ResponseEntity<List<HabitResponse>> getAllHabitsIncludingArchived() {
        return ResponseEntity.ok(habitService.getAllHabits());
    }

    @GetMapping("/today")
    public ResponseEntity<List<HabitResponse>> getTodayHabits() {
        return ResponseEntity.ok(habitService.getTodayHabits());
    }

    @GetMapping("/{id}")
    public ResponseEntity<HabitResponse> getHabit(@PathVariable UUID id) {
        return ResponseEntity.ok(habitService.getHabit(id));
    }

    @PostMapping
    public ResponseEntity<HabitResponse> createHabit(@Valid @RequestBody HabitRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(habitService.createHabit(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<HabitResponse> updateHabit(@PathVariable UUID id, @Valid @RequestBody HabitRequest request) {
        return ResponseEntity.ok(habitService.updateHabit(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteHabit(@PathVariable UUID id) {
        habitService.deleteHabit(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/toggle")
    public ResponseEntity<HabitCompletionResponse> toggleCompletion(
            @PathVariable UUID id,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null) date = LocalDate.now();
        HabitCompletionResponse result = habitService.toggleCompletion(id, date);
        if (result == null) {
            return ResponseEntity.ok().build(); // uncompleted
        }
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}/completions")
    public ResponseEntity<List<HabitCompletionResponse>> getCompletions(
            @PathVariable UUID id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate end) {
        return ResponseEntity.ok(habitService.getCompletions(id, start, end));
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<HabitStatsResponse> getStats(@PathVariable UUID id) {
        return ResponseEntity.ok(habitService.getStats(id));
    }

    @GetMapping("/insights")
    public ResponseEntity<HabitInsightsResponse> getInsights() {
        return ResponseEntity.ok(habitService.getInsights());
    }
}
