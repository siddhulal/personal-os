-- Learning Roadmaps
CREATE TABLE learning_roadmaps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_learning_roadmaps_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_learning_roadmaps_user_id ON learning_roadmaps(user_id);

-- Learning Topics (with self-referencing parent for hierarchical structure)
CREATE TABLE learning_topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
    notes TEXT,
    roadmap_id UUID NOT NULL,
    parent_topic_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_learning_topics_roadmap FOREIGN KEY (roadmap_id) REFERENCES learning_roadmaps(id) ON DELETE CASCADE,
    CONSTRAINT fk_learning_topics_parent FOREIGN KEY (parent_topic_id) REFERENCES learning_topics(id) ON DELETE CASCADE
);

CREATE INDEX idx_learning_topics_roadmap_id ON learning_topics(roadmap_id);
CREATE INDEX idx_learning_topics_parent_topic_id ON learning_topics(parent_topic_id);
CREATE INDEX idx_learning_topics_status ON learning_topics(status);

-- Skills
CREATE TABLE skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'BEGINNER',
    confidence_score INT NOT NULL DEFAULT 1,
    last_practiced DATE,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_skills_user_id ON skills(user_id);
CREATE INDEX idx_skills_level ON skills(level);
