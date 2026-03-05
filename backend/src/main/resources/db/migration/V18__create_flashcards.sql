-- Flashcard system with spaced repetition (FSRS algorithm)
CREATE TABLE flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    note_id UUID REFERENCES notes(id),

    front TEXT NOT NULL,
    back TEXT NOT NULL,
    deck VARCHAR(255) DEFAULT 'General',

    -- FSRS scheduling fields
    stability DOUBLE PRECISION NOT NULL DEFAULT 0,
    difficulty DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    elapsed_days INT NOT NULL DEFAULT 0,
    scheduled_days INT NOT NULL DEFAULT 0,
    reps INT NOT NULL DEFAULT 0,
    lapses INT NOT NULL DEFAULT 0,
    state INT NOT NULL DEFAULT 0,  -- 0=New, 1=Learning, 2=Review, 3=Relearning
    last_review TIMESTAMP,
    next_review TIMESTAMP,

    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_flashcards_user ON flashcards(user_id);
CREATE INDEX idx_flashcards_next_review ON flashcards(user_id, next_review);
CREATE INDEX idx_flashcards_deck ON flashcards(user_id, deck);
CREATE INDEX idx_flashcards_note ON flashcards(note_id);
