-- Habits table
CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    frequency VARCHAR(20) NOT NULL DEFAULT 'DAILY',
    frequency_days INTEGER[] DEFAULT '{}',
    category VARCHAR(100),
    color VARCHAR(30) DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT 'check',
    is_micro_habit BOOLEAN DEFAULT FALSE,
    micro_habit_cue TEXT,
    reminder_time TIME,
    target_count INTEGER DEFAULT 1,
    order_index INTEGER NOT NULL DEFAULT 0,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_habits_user ON habits (user_id);
CREATE INDEX idx_habits_user_active ON habits (user_id) WHERE deleted_at IS NULL AND archived_at IS NULL;

-- Habit completions table
CREATE TABLE habit_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    completed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    value INTEGER DEFAULT 1,
    notes TEXT,
    CONSTRAINT uq_habit_completion UNIQUE (habit_id, completed_date)
);

CREATE INDEX idx_habit_completions_habit ON habit_completions (habit_id);
CREATE INDEX idx_habit_completions_user_date ON habit_completions (user_id, completed_date);
CREATE INDEX idx_habit_completions_habit_date ON habit_completions (habit_id, completed_date);
