package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookService {

    private final BookRepository bookRepository;
    private final BookHighlightRepository highlightRepository;
    private final BookBookmarkRepository bookmarkRepository;
    private final TagRepository tagRepository;
    private final FileUploadService fileUploadService;

    // ==================== BOOKS CRUD ====================

    public PageResponse<BookResponse> getAllBooks(String status, String category, String search, Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<Book> page;

        if (search != null && !search.isBlank()) {
            page = bookRepository.search(userId, search.trim(), pageable);
        } else if (status != null && !status.isBlank()) {
            page = bookRepository.findByUserIdAndStatusAndDeletedAtIsNull(userId, Book.Status.valueOf(status), pageable);
        } else if (category != null && !category.isBlank()) {
            page = bookRepository.findByUserIdAndCategoryAndDeletedAtIsNull(userId, category, pageable);
        } else {
            page = bookRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        }

        return toPageResponse(page);
    }

    public BookResponse getBook(UUID id) {
        Book book = findBookByIdAndUser(id);
        return mapToResponse(book);
    }

    @Transactional
    public BookResponse createBook(MultipartFile file, String title, String author, String description,
                                    String category, Integer totalPages, List<UUID> tagIds) {
        User user = getCurrentUser();

        String filename = fileUploadService.save(file);
        String fileUrl = "/uploads/" + filename;

        String originalName = file.getOriginalFilename();
        String fileType = "PDF";
        if (originalName != null && originalName.toLowerCase().endsWith(".epub")) {
            fileType = "EPUB";
        }

        Book book = Book.builder()
                .title(title)
                .author(author)
                .description(description)
                .fileUrl(fileUrl)
                .fileType(Book.FileType.valueOf(fileType))
                .fileSize(file.getSize())
                .totalPages(totalPages != null ? totalPages : 0)
                .currentPage(0)
                .status(Book.Status.UNREAD)
                .category(category != null ? category : "GENERAL")
                .user(user)
                .build();

        if (tagIds != null && !tagIds.isEmpty()) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(tagIds, user.getId()));
            book.setTags(tags);
        }

        book = bookRepository.save(book);
        return mapToResponse(book);
    }

    @Transactional
    public BookResponse updateBook(UUID id, BookRequest request) {
        Book book = findBookByIdAndUser(id);

        if (request.getTitle() != null) book.setTitle(request.getTitle());
        if (request.getAuthor() != null) book.setAuthor(request.getAuthor());
        if (request.getDescription() != null) book.setDescription(request.getDescription());
        if (request.getCategory() != null) book.setCategory(request.getCategory());
        if (request.getTotalPages() != null) book.setTotalPages(request.getTotalPages());

        if (request.getTagIds() != null) {
            Set<Tag> tags = new HashSet<>(tagRepository.findByIdInAndUserId(request.getTagIds(), getCurrentUserId()));
            book.setTags(tags);
        }

        book = bookRepository.save(book);
        return mapToResponse(book);
    }

    @Transactional
    public void deleteBook(UUID id) {
        Book book = findBookByIdAndUser(id);
        book.softDelete();
        bookRepository.save(book);
    }

    @Transactional
    public BookResponse updateProgress(UUID id, int currentPage) {
        Book book = findBookByIdAndUser(id);
        book.setCurrentPage(currentPage);

        if (book.getStatus() == Book.Status.UNREAD && currentPage > 0) {
            book.setStatus(Book.Status.READING);
            book.setStartedAt(LocalDateTime.now());
        }

        if (book.getTotalPages() != null && book.getTotalPages() > 0 && currentPage >= book.getTotalPages()) {
            book.setStatus(Book.Status.COMPLETED);
            book.setFinishedAt(LocalDateTime.now());
        }

        book = bookRepository.save(book);
        return mapToResponse(book);
    }

    @Transactional
    public BookResponse updateRating(UUID id, int rating) {
        Book book = findBookByIdAndUser(id);
        book.setRating(rating);
        book = bookRepository.save(book);
        return mapToResponse(book);
    }

    @Transactional
    public BookResponse updateStatus(UUID id, String status) {
        Book book = findBookByIdAndUser(id);
        book.setStatus(Book.Status.valueOf(status));
        if (book.getStatus() == Book.Status.READING && book.getStartedAt() == null) {
            book.setStartedAt(LocalDateTime.now());
        }
        if (book.getStatus() == Book.Status.COMPLETED && book.getFinishedAt() == null) {
            book.setFinishedAt(LocalDateTime.now());
        }
        book = bookRepository.save(book);
        return mapToResponse(book);
    }

    public Map<String, Object> getStats() {
        UUID userId = getCurrentUserId();
        long total = bookRepository.countByUserIdAndDeletedAtIsNull(userId);
        long reading = bookRepository.countByUserIdAndStatusAndDeletedAtIsNull(userId, Book.Status.READING);
        long completed = bookRepository.countByUserIdAndStatusAndDeletedAtIsNull(userId, Book.Status.COMPLETED);
        long pagesRead = bookRepository.sumCurrentPagesByUserId(userId);

        return Map.of(
                "totalBooks", total,
                "reading", reading,
                "completed", completed,
                "pagesRead", pagesRead
        );
    }

    // ==================== HIGHLIGHTS ====================

    public List<BookHighlightResponse> getHighlights(UUID bookId) {
        findBookByIdAndUser(bookId);
        return highlightRepository.findByBookIdAndDeletedAtIsNullOrderByPageNumberAscCreatedAtAsc(bookId)
                .stream().map(this::mapToHighlightResponse).collect(Collectors.toList());
    }

    @Transactional
    public BookHighlightResponse createHighlight(UUID bookId, BookHighlightRequest request) {
        Book book = findBookByIdAndUser(bookId);
        User user = getCurrentUser();

        BookHighlight highlight = BookHighlight.builder()
                .pageNumber(request.getPageNumber())
                .selectedText(request.getSelectedText())
                .aiResponse(request.getAiResponse())
                .aiActionType(request.getAiActionType() != null ?
                        BookHighlight.ActionType.valueOf(request.getAiActionType()) : null)
                .color(request.getColor() != null ? request.getColor() : "#FBBF24")
                .note(request.getNote())
                .book(book)
                .user(user)
                .build();

        highlight = highlightRepository.save(highlight);
        return mapToHighlightResponse(highlight);
    }

    @Transactional
    public BookHighlightResponse updateHighlight(UUID bookId, UUID highlightId, BookHighlightRequest request) {
        findBookByIdAndUser(bookId);
        BookHighlight highlight = highlightRepository.findById(highlightId)
                .orElseThrow(() -> new ResourceNotFoundException("BookHighlight", "id", highlightId));

        if (request.getNote() != null) highlight.setNote(request.getNote());
        if (request.getColor() != null) highlight.setColor(request.getColor());
        if (request.getAiResponse() != null) highlight.setAiResponse(request.getAiResponse());

        highlight = highlightRepository.save(highlight);
        return mapToHighlightResponse(highlight);
    }

    @Transactional
    public void deleteHighlight(UUID bookId, UUID highlightId) {
        findBookByIdAndUser(bookId);
        BookHighlight highlight = highlightRepository.findById(highlightId)
                .orElseThrow(() -> new ResourceNotFoundException("BookHighlight", "id", highlightId));
        highlight.softDelete();
        highlightRepository.save(highlight);
    }

    // ==================== BOOKMARKS ====================

    public List<BookBookmarkResponse> getBookmarks(UUID bookId) {
        findBookByIdAndUser(bookId);
        return bookmarkRepository.findByBookIdAndDeletedAtIsNullOrderByPageNumberAsc(bookId)
                .stream().map(this::mapToBookmarkResponse).collect(Collectors.toList());
    }

    @Transactional
    public BookBookmarkResponse createBookmark(UUID bookId, int pageNumber, String label) {
        Book book = findBookByIdAndUser(bookId);
        User user = getCurrentUser();

        BookBookmark bookmark = BookBookmark.builder()
                .pageNumber(pageNumber)
                .label(label)
                .book(book)
                .user(user)
                .build();

        bookmark = bookmarkRepository.save(bookmark);
        return mapToBookmarkResponse(bookmark);
    }

    @Transactional
    public void deleteBookmark(UUID bookId, UUID bookmarkId) {
        findBookByIdAndUser(bookId);
        BookBookmark bookmark = bookmarkRepository.findById(bookmarkId)
                .orElseThrow(() -> new ResourceNotFoundException("BookBookmark", "id", bookmarkId));
        bookmark.softDelete();
        bookmarkRepository.save(bookmark);
    }

    // ==================== HELPERS ====================

    private Book findBookByIdAndUser(UUID id) {
        Book book = bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Book", "id", id));
        if (!book.getUser().getId().equals(getCurrentUserId()) || book.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Book", "id", id);
        }
        return book;
    }

    private BookResponse mapToResponse(Book book) {
        long highlightCount = highlightRepository.countByBookIdAndDeletedAtIsNull(book.getId());
        long bookmarkCount = bookmarkRepository.countByBookIdAndDeletedAtIsNull(book.getId());

        return BookResponse.builder()
                .id(book.getId())
                .title(book.getTitle())
                .author(book.getAuthor())
                .description(book.getDescription())
                .coverImageUrl(book.getCoverImageUrl())
                .fileUrl(book.getFileUrl())
                .fileType(book.getFileType().name())
                .fileSize(book.getFileSize())
                .totalPages(book.getTotalPages())
                .currentPage(book.getCurrentPage())
                .status(book.getStatus().name())
                .category(book.getCategory())
                .rating(book.getRating())
                .startedAt(book.getStartedAt())
                .finishedAt(book.getFinishedAt())
                .tags(book.getTags() != null ? book.getTags().stream()
                        .map(tag -> TagResponse.builder()
                                .id(tag.getId()).name(tag.getName()).color(tag.getColor()).build())
                        .collect(Collectors.toList()) : List.of())
                .highlightCount((int) highlightCount)
                .bookmarkCount((int) bookmarkCount)
                .createdAt(book.getCreatedAt())
                .updatedAt(book.getUpdatedAt())
                .build();
    }

    private BookHighlightResponse mapToHighlightResponse(BookHighlight h) {
        return BookHighlightResponse.builder()
                .id(h.getId())
                .bookId(h.getBook().getId())
                .pageNumber(h.getPageNumber())
                .selectedText(h.getSelectedText())
                .aiResponse(h.getAiResponse())
                .aiActionType(h.getAiActionType() != null ? h.getAiActionType().name() : null)
                .color(h.getColor())
                .note(h.getNote())
                .linkedNoteId(h.getLinkedNoteId())
                .createdAt(h.getCreatedAt())
                .build();
    }

    private BookBookmarkResponse mapToBookmarkResponse(BookBookmark b) {
        return BookBookmarkResponse.builder()
                .id(b.getId())
                .bookId(b.getBook().getId())
                .pageNumber(b.getPageNumber())
                .label(b.getLabel())
                .createdAt(b.getCreatedAt())
                .build();
    }

    private PageResponse<BookResponse> toPageResponse(Page<Book> page) {
        return PageResponse.<BookResponse>builder()
                .content(page.getContent().stream().map(this::mapToResponse).collect(Collectors.toList()))
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .last(page.isLast())
                .build();
    }

    private UUID getCurrentUserId() {
        return getCurrentUser().getId();
    }

    private User getCurrentUser() {
        return (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
