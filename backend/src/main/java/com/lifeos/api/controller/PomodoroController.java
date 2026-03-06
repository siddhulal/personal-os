package com.lifeos.api.controller;

import com.lifeos.api.dto.PomodoroSessionRequest;
import com.lifeos.api.dto.PomodoroSessionResponse;
import com.lifeos.api.service.PomodoroSessionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pomodoro")
@RequiredArgsConstructor
public class PomodoroController {

    private final PomodoroSessionService pomodoroSessionService;

    @GetMapping
    public ResponseEntity<List<PomodoroSessionResponse>> listSessions() {
        return ResponseEntity.ok(pomodoroSessionService.listSessions());
    }

    @GetMapping("/range")
    public ResponseEntity<List<PomodoroSessionResponse>> getSessionsByDateRange(
            @RequestParam LocalDateTime start,
            @RequestParam LocalDateTime end) {
        return ResponseEntity.ok(pomodoroSessionService.getSessionsByDateRange(start, end));
    }

    @PostMapping
    public ResponseEntity<PomodoroSessionResponse> createSession(@Valid @RequestBody PomodoroSessionRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(pomodoroSessionService.createSession(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSession(@PathVariable UUID id) {
        pomodoroSessionService.deleteSession(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(pomodoroSessionService.getStats());
    }
}
