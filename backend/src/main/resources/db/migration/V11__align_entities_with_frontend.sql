-- Add status and category to ideas table
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'CAPTURED';
ALTER TABLE ideas ADD COLUMN IF NOT EXISTS category VARCHAR(20) DEFAULT 'OTHER';

-- Add timeframe, progress to goals table
ALTER TABLE goals ADD COLUMN IF NOT EXISTS timeframe VARCHAR(20) DEFAULT 'MONTHLY';
ALTER TABLE goals ADD COLUMN IF NOT EXISTS progress INT DEFAULT 0;

-- Add category and notes to skills table
ALTER TABLE skills ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE skills ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create goal_tags join table
CREATE TABLE IF NOT EXISTS goal_tags (
    goal_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (goal_id, tag_id),
    CONSTRAINT fk_goal_tags_goal FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
    CONSTRAINT fk_goal_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goal_tags_tag_id ON goal_tags(tag_id);

-- Create skill_tags join table
CREATE TABLE IF NOT EXISTS skill_tags (
    skill_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (skill_id, tag_id),
    CONSTRAINT fk_skill_tags_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE,
    CONSTRAINT fk_skill_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_skill_tags_tag_id ON skill_tags(tag_id);

-- Update goal status: rename ACTIVE -> IN_PROGRESS
UPDATE goals SET status = 'IN_PROGRESS' WHERE status = 'ACTIVE';
-- Map NOT_STARTED for goals without a matching status
UPDATE goals SET status = 'NOT_STARTED' WHERE status NOT IN ('IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'NOT_STARTED');
