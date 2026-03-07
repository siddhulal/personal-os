-- Add missing columns to learning_topics
ALTER TABLE learning_topics ADD COLUMN IF NOT EXISTS estimated_hours DOUBLE PRECISION;
ALTER TABLE learning_topics ADD COLUMN IF NOT EXISTS actual_hours DOUBLE PRECISION;
ALTER TABLE learning_topics ADD COLUMN IF NOT EXISTS resources TEXT;

-- Add missing columns to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS target_date DATE;

-- Create missing project_tags join table
CREATE TABLE IF NOT EXISTS project_tags (
    project_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (project_id, tag_id),
    CONSTRAINT fk_project_tags_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_project_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_tags_tag_id ON project_tags(tag_id);
