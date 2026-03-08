package com.lifeos.api.controller;

import com.lifeos.api.dto.*;
import com.lifeos.api.service.AiGenerateService;
import com.lifeos.api.service.BookService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/books")
@RequiredArgsConstructor
public class BookController {

    private final BookService bookService;
    private final AiGenerateService aiGenerateService;

    // ==================== BOOKS CRUD ====================

    @GetMapping
    public ResponseEntity<PageResponse<BookResponse>> getAllBooks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String search,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(bookService.getAllBooks(status, category, search, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookResponse> getBook(@PathVariable UUID id) {
        return ResponseEntity.ok(bookService.getBook(id));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BookResponse> createBook(
            @RequestParam("file") MultipartFile file,
            @RequestParam("title") String title,
            @RequestParam(value = "author", required = false) String author,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "totalPages", required = false) Integer totalPages,
            @RequestParam(value = "tagIds", required = false) List<UUID> tagIds) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(bookService.createBook(file, title, author, description, category, totalPages, tagIds));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookResponse> updateBook(@PathVariable UUID id, @Valid @RequestBody BookRequest request) {
        return ResponseEntity.ok(bookService.updateBook(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBook(@PathVariable UUID id) {
        bookService.deleteBook(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/progress")
    public ResponseEntity<BookResponse> updateProgress(
            @PathVariable UUID id,
            @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(bookService.updateProgress(id, body.get("currentPage")));
    }

    @PatchMapping("/{id}/rating")
    public ResponseEntity<BookResponse> updateRating(
            @PathVariable UUID id,
            @RequestBody Map<String, Integer> body) {
        return ResponseEntity.ok(bookService.updateRating(id, body.get("rating")));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<BookResponse> updateStatus(
            @PathVariable UUID id,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(bookService.updateStatus(id, body.get("status")));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(bookService.getStats());
    }

    // ==================== HIGHLIGHTS ====================

    @GetMapping("/{id}/highlights")
    public ResponseEntity<List<BookHighlightResponse>> getHighlights(@PathVariable UUID id) {
        return ResponseEntity.ok(bookService.getHighlights(id));
    }

    @PostMapping("/{id}/highlights")
    public ResponseEntity<BookHighlightResponse> createHighlight(
            @PathVariable UUID id,
            @Valid @RequestBody BookHighlightRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.createHighlight(id, request));
    }

    @PutMapping("/{id}/highlights/{highlightId}")
    public ResponseEntity<BookHighlightResponse> updateHighlight(
            @PathVariable UUID id,
            @PathVariable UUID highlightId,
            @Valid @RequestBody BookHighlightRequest request) {
        return ResponseEntity.ok(bookService.updateHighlight(id, highlightId, request));
    }

    @DeleteMapping("/{id}/highlights/{highlightId}")
    public ResponseEntity<Void> deleteHighlight(@PathVariable UUID id, @PathVariable UUID highlightId) {
        bookService.deleteHighlight(id, highlightId);
        return ResponseEntity.noContent().build();
    }

    // ==================== BOOKMARKS ====================

    @GetMapping("/{id}/bookmarks")
    public ResponseEntity<List<BookBookmarkResponse>> getBookmarks(@PathVariable UUID id) {
        return ResponseEntity.ok(bookService.getBookmarks(id));
    }

    @PostMapping("/{id}/bookmarks")
    public ResponseEntity<BookBookmarkResponse> createBookmark(
            @PathVariable UUID id,
            @RequestBody Map<String, Object> body) {
        int pageNumber = (int) body.get("pageNumber");
        String label = (String) body.getOrDefault("label", null);
        return ResponseEntity.status(HttpStatus.CREATED).body(bookService.createBookmark(id, pageNumber, label));
    }

    @DeleteMapping("/{id}/bookmarks/{bookmarkId}")
    public ResponseEntity<Void> deleteBookmark(@PathVariable UUID id, @PathVariable UUID bookmarkId) {
        bookService.deleteBookmark(id, bookmarkId);
        return ResponseEntity.noContent().build();
    }

    // ==================== AI ACTIONS ====================

    @PostMapping("/{id}/ai")
    public ResponseEntity<AiGenerateResponse> bookAiAction(
            @PathVariable UUID id,
            @Valid @RequestBody BookAiRequest request) {
        return ResponseEntity.ok(aiGenerateService.bookAiAction(id, request));
    }
}
