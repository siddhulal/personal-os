-- Add daily note fields to notes table
ALTER TABLE notes ADD COLUMN is_daily_note BOOLEAN DEFAULT FALSE;
ALTER TABLE notes ADD COLUMN daily_note_date DATE;

-- Unique constraint: one daily note per user per date
CREATE UNIQUE INDEX idx_notes_user_daily_date ON notes (user_id, daily_note_date) WHERE daily_note_date IS NOT NULL;

-- Note links table for wiki-style linking between notes
CREATE TABLE note_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_note_link UNIQUE (source_note_id, target_note_id)
);

-- Indexes for efficient graph queries
CREATE INDEX idx_note_links_source ON note_links (source_note_id);
CREATE INDEX idx_note_links_target ON note_links (target_note_id);
CREATE INDEX idx_note_links_user ON note_links (user_id);
