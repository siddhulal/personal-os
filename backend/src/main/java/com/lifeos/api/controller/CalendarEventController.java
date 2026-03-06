package com.lifeos.api.controller;

import com.lifeos.api.dto.CalendarEventRequest;
import com.lifeos.api.dto.CalendarEventResponse;
import com.lifeos.api.service.CalendarEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarEventController {

    private final CalendarEventService calendarEventService;

    @GetMapping
    public ResponseEntity<List<CalendarEventResponse>> listEvents(
            @RequestParam LocalDateTime start,
            @RequestParam LocalDateTime end) {
        return ResponseEntity.ok(calendarEventService.listEvents(start, end));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CalendarEventResponse> getEvent(@PathVariable UUID id) {
        return ResponseEntity.ok(calendarEventService.getEvent(id));
    }

    @PostMapping
    public ResponseEntity<CalendarEventResponse> createEvent(@Valid @RequestBody CalendarEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(calendarEventService.createEvent(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CalendarEventResponse> updateEvent(@PathVariable UUID id,
                                                              @Valid @RequestBody CalendarEventRequest request) {
        return ResponseEntity.ok(calendarEventService.updateEvent(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable UUID id) {
        calendarEventService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
