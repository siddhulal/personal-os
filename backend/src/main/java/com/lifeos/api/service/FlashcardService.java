package com.lifeos.api.service;

import com.lifeos.api.dto.*;
import com.lifeos.api.entity.*;
import com.lifeos.api.exception.ResourceNotFoundException;
import com.lifeos.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FlashcardService {

    private final FlashcardRepository flashcardRepository;
    private final NoteRepository noteRepository;

    // ==================== FSRS Parameters ====================
    private static final double[] W = {
        0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14,
        0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61
    };
    private static final double DECAY = -0.5;
    private static final double FACTOR = Math.pow(0.9, 1.0 / DECAY) - 1;

    // ==================== CRUD ====================

    public PageResponse<FlashcardResponse> getAllCards(Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<Flashcard> page = flashcardRepository.findByUserIdAndDeletedAtIsNull(userId, pageable);
        return toPageResponse(page);
    }

    public PageResponse<FlashcardResponse> getCardsByDeck(String deck, Pageable pageable) {
        UUID userId = getCurrentUserId();
        Page<Flashcard> page = flashcardRepository.findByUserIdAndDeckAndDeletedAtIsNull(userId, deck, pageable);
        return toPageResponse(page);
    }

    public FlashcardResponse getCard(UUID id) {
        Flashcard card = findByIdAndUser(id);
        return mapToResponse(card);
    }

    @Transactional
    public FlashcardResponse createCard(FlashcardRequest request) {
        User user = getCurrentUser();
        Flashcard card = new Flashcard();
        card.setFront(request.getFront());
        card.setBack(request.getBack());
        card.setDeck(request.getDeck() != null ? request.getDeck() : "General");
        card.setUser(user);
        card.setStability(0);
        card.setDifficulty(0.3);
        card.setState(Flashcard.State.NEW.value);
        card.setReps(0);
        card.setLapses(0);
        card.setElapsedDays(0);
        card.setScheduledDays(0);

        if (request.getNoteId() != null) {
            Note note = noteRepository.findById(request.getNoteId()).orElse(null);
            if (note != null && note.getUser().getId().equals(user.getId())) {
                card.setNote(note);
            }
        }

        card = flashcardRepository.save(card);
        return mapToResponse(card);
    }

    @Transactional
    public FlashcardResponse updateCard(UUID id, FlashcardRequest request) {
        Flashcard card = findByIdAndUser(id);
        card.setFront(request.getFront());
        card.setBack(request.getBack());
        if (request.getDeck() != null) card.setDeck(request.getDeck());
        card = flashcardRepository.save(card);
        return mapToResponse(card);
    }

    @Transactional
    public void deleteCard(UUID id) {
        Flashcard card = findByIdAndUser(id);
        card.softDelete();
        flashcardRepository.save(card);
    }

    // ==================== Review (FSRS) ====================

    public List<FlashcardResponse> getDueCards(String deck) {
        UUID userId = getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();
        List<Flashcard> cards;
        if (deck != null && !deck.isEmpty()) {
            cards = flashcardRepository.findDueCardsByDeck(userId, deck, now);
        } else {
            cards = flashcardRepository.findDueCards(userId, now);
        }
        return cards.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Transactional
    public FlashcardResponse reviewCard(UUID id, int rating) {
        Flashcard card = findByIdAndUser(id);
        LocalDateTime now = LocalDateTime.now();

        int elapsedDays = card.getLastReview() != null
            ? (int) ChronoUnit.DAYS.between(card.getLastReview(), now)
            : 0;
        card.setElapsedDays(elapsedDays);

        Flashcard.State currentState = Flashcard.State.fromValue(card.getState());

        switch (currentState) {
            case NEW -> scheduleNew(card, rating, now);
            case LEARNING, RELEARNING -> scheduleLearning(card, rating, now);
            case REVIEW -> scheduleReview(card, rating, now);
        }

        card.setLastReview(now);
        card.setReps(card.getReps() + 1);
        card = flashcardRepository.save(card);
        return mapToResponse(card);
    }

    // ==================== Stats ====================

    public FlashcardStatsResponse getStats() {
        UUID userId = getCurrentUserId();
        LocalDateTime now = LocalDateTime.now();
        int total = flashcardRepository.countByUserIdAndDeletedAtIsNull(userId);
        int due = flashcardRepository.countDueCards(userId, now);
        int mastered = flashcardRepository.countMasteredCards(userId);
        List<String> decks = flashcardRepository.findDistinctDecks(userId);

        long newCards = flashcardRepository.countByUserIdAndStateAndDeletedAtIsNull(userId, 0);
        long learningCards = flashcardRepository.countByUserIdAndStateAndDeletedAtIsNull(userId, 1);
        long reviewCards = flashcardRepository.countByUserIdAndStateAndDeletedAtIsNull(userId, 2);

        return FlashcardStatsResponse.builder()
            .totalCards(total)
            .dueCards(due)
            .newCards((int) newCards)
            .learningCards((int) learningCards)
            .reviewCards((int) reviewCards)
            .masteredCards(mastered)
            .decks(decks)
            .build();
    }

    // ==================== FSRS Scheduling Logic ====================

    private void scheduleNew(Flashcard card, int rating, LocalDateTime now) {
        card.setDifficulty(initDifficulty(rating));
        card.setStability(initStability(rating));

        if (rating == Flashcard.Rating.AGAIN.value) {
            card.setState(Flashcard.State.LEARNING.value);
            card.setScheduledDays(0);
            card.setNextReview(now.plusMinutes(1));
        } else if (rating == Flashcard.Rating.HARD.value) {
            card.setState(Flashcard.State.LEARNING.value);
            card.setScheduledDays(0);
            card.setNextReview(now.plusMinutes(5));
        } else if (rating == Flashcard.Rating.GOOD.value) {
            card.setState(Flashcard.State.LEARNING.value);
            card.setScheduledDays(0);
            card.setNextReview(now.plusMinutes(10));
        } else { // EASY
            int interval = nextInterval(card.getStability());
            card.setState(Flashcard.State.REVIEW.value);
            card.setScheduledDays(interval);
            card.setNextReview(now.plusDays(interval));
        }
    }

    private void scheduleLearning(Flashcard card, int rating, LocalDateTime now) {
        card.setDifficulty(nextDifficulty(card.getDifficulty(), rating));
        card.setStability(shortTermStability(card.getStability(), rating));

        if (rating == Flashcard.Rating.AGAIN.value) {
            card.setState(card.getState() == Flashcard.State.LEARNING.value
                ? Flashcard.State.LEARNING.value : Flashcard.State.RELEARNING.value);
            card.setScheduledDays(0);
            card.setNextReview(now.plusMinutes(5));
        } else if (rating == Flashcard.Rating.HARD.value) {
            card.setScheduledDays(0);
            card.setNextReview(now.plusMinutes(10));
        } else { // GOOD or EASY
            int interval = nextInterval(card.getStability());
            card.setState(Flashcard.State.REVIEW.value);
            card.setScheduledDays(interval);
            card.setNextReview(now.plusDays(interval));
        }
    }

    private void scheduleReview(Flashcard card, int rating, LocalDateTime now) {
        int elapsedDays = card.getElapsedDays();
        double retrievability = Math.pow(1 + FACTOR * elapsedDays / card.getStability(), DECAY);

        card.setDifficulty(nextDifficulty(card.getDifficulty(), rating));

        if (rating == Flashcard.Rating.AGAIN.value) {
            card.setStability(nextForgetStability(card.getDifficulty(), card.getStability(), retrievability));
            card.setLapses(card.getLapses() + 1);
            card.setState(Flashcard.State.RELEARNING.value);
            card.setScheduledDays(0);
            card.setNextReview(now.plusMinutes(5));
        } else {
            card.setStability(nextRecallStability(card.getDifficulty(), card.getStability(), retrievability, rating));
            int interval = nextInterval(card.getStability());
            card.setState(Flashcard.State.REVIEW.value);
            card.setScheduledDays(interval);
            card.setNextReview(now.plusDays(interval));
        }
    }

    private double initDifficulty(int rating) {
        return Math.max(1, Math.min(10, W[4] - Math.exp(W[5] * (rating - 1)) + 1));
    }

    private double initStability(int rating) {
        return Math.max(0.1, W[rating - 1]);
    }

    private double nextDifficulty(double d, int rating) {
        double newD = d - W[6] * (rating - 3);
        return Math.max(1, Math.min(10, meanReversion(W[4], newD)));
    }

    private double meanReversion(double init, double current) {
        return W[7] * init + (1 - W[7]) * current;
    }

    private double shortTermStability(double s, int rating) {
        return s * Math.exp(W[16] * (rating - 3 + W[15]));
    }

    private double nextRecallStability(double d, double s, double r, int rating) {
        double hardPenalty = rating == Flashcard.Rating.HARD.value ? W[15] : 1;
        double easyBonus = rating == Flashcard.Rating.EASY.value ? W[16] : 1;
        return s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9])
            * (Math.exp((1 - r) * W[10]) - 1) * hardPenalty * easyBonus);
    }

    private double nextForgetStability(double d, double s, double r) {
        return W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14]);
    }

    private int nextInterval(double stability) {
        double interval = stability / FACTOR * (Math.pow(0.9, 1.0 / DECAY) - 1);
        return Math.max(1, (int) Math.round(Math.min(interval, 36500))); // cap at 100 years
    }

    // ==================== Helpers ====================

    private Flashcard findByIdAndUser(UUID id) {
        Flashcard card = flashcardRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Flashcard", "id", id));
        if (!card.getUser().getId().equals(getCurrentUserId()) || card.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Flashcard", "id", id);
        }
        return card;
    }

    private FlashcardResponse mapToResponse(Flashcard card) {
        String[] stateLabels = {"New", "Learning", "Review", "Relearning"};
        return FlashcardResponse.builder()
            .id(card.getId())
            .front(card.getFront())
            .back(card.getBack())
            .deck(card.getDeck())
            .noteId(card.getNote() != null ? card.getNote().getId() : null)
            .noteTitle(card.getNote() != null ? card.getNote().getTitle() : null)
            .stability(card.getStability())
            .difficulty(card.getDifficulty())
            .reps(card.getReps())
            .lapses(card.getLapses())
            .state(card.getState())
            .stateLabel(stateLabels[Math.min(card.getState(), 3)])
            .lastReview(card.getLastReview())
            .nextReview(card.getNextReview())
            .createdAt(card.getCreatedAt())
            .updatedAt(card.getUpdatedAt())
            .build();
    }

    private PageResponse<FlashcardResponse> toPageResponse(Page<Flashcard> page) {
        return PageResponse.<FlashcardResponse>builder()
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
