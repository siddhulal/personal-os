package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.FlashcardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/flashcards")
@RequiredArgsConstructor
public class FlashcardController {

    private final FlashcardService flashcardService;

    @GetMapping
    public ResponseEntity<PageResponse<FlashcardResponse>> getAllCards(
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(flashcardService.getAllCards(pageable));
    }

    @GetMapping("/deck/{deck}")
    public ResponseEntity<PageResponse<FlashcardResponse>> getCardsByDeck(
            @PathVariable String deck,
            @PageableDefault(size = 50, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(flashcardService.getCardsByDeck(deck, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FlashcardResponse> getCard(@PathVariable UUID id) {
        return ResponseEntity.ok(flashcardService.getCard(id));
    }

    @PostMapping
    public ResponseEntity<FlashcardResponse> createCard(@Valid @RequestBody FlashcardRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(flashcardService.createCard(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FlashcardResponse> updateCard(@PathVariable UUID id,
                                                         @Valid @RequestBody FlashcardRequest request) {
        return ResponseEntity.ok(flashcardService.updateCard(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCard(@PathVariable UUID id) {
        flashcardService.deleteCard(id);
        return ResponseEntity.noContent().build();
    }

    // ==================== Review ====================

    @GetMapping("/due")
    public ResponseEntity<List<FlashcardResponse>> getDueCards(
            @RequestParam(required = false) String deck) {
        return ResponseEntity.ok(flashcardService.getDueCards(deck));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<FlashcardResponse> reviewCard(
            @PathVariable UUID id,
            @Valid @RequestBody FlashcardReviewRequest request) {
        return ResponseEntity.ok(flashcardService.reviewCard(id, request.getRating()));
    }

    // ==================== Stats ====================

    @GetMapping("/stats")
    public ResponseEntity<FlashcardStatsResponse> getStats() {
        return ResponseEntity.ok(flashcardService.getStats());
    }
}
