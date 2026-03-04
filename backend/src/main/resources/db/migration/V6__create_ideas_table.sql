CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_ideas_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_ideas_user_id ON ideas(user_id);

CREATE TABLE idea_tags (
    idea_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (idea_id, tag_id),
    CONSTRAINT fk_idea_tags_idea FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    CONSTRAINT fk_idea_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_idea_tags_tag_id ON idea_tags(tag_id);
