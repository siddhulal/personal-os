-- Notebooks table
CREATE TABLE notebooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(30) DEFAULT '#6366f1',
    icon VARCHAR(50) DEFAULT 'notebook',
    order_index INT NOT NULL DEFAULT 0,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_notebooks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notebooks_user_id ON notebooks(user_id);

-- Sections table
CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    notebook_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_sections_notebook FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE CASCADE,
    CONSTRAINT fk_sections_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_sections_notebook_id ON sections(notebook_id);
CREATE INDEX idx_sections_user_id ON sections(user_id);

-- Add notebook/section references and content_json to notes
ALTER TABLE notes ADD COLUMN IF NOT EXISTS notebook_id UUID;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS section_id UUID;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
ALTER TABLE notes ADD COLUMN IF NOT EXISTS content_json JSONB;

ALTER TABLE notes ADD CONSTRAINT fk_notes_notebook FOREIGN KEY (notebook_id) REFERENCES notebooks(id) ON DELETE SET NULL;
ALTER TABLE notes ADD CONSTRAINT fk_notes_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL;

CREATE INDEX idx_notes_notebook_id ON notes(notebook_id);
CREATE INDEX idx_notes_section_id ON notes(section_id);

-- Full-text search index on notes
CREATE INDEX idx_notes_title_content_search ON notes USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));
