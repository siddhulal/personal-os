-- Interview Questions
CREATE TABLE interview_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text TEXT NOT NULL,
    category VARCHAR(100),
    difficulty VARCHAR(10) NOT NULL DEFAULT 'MEDIUM',
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_interview_questions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_interview_questions_user_id ON interview_questions(user_id);
CREATE INDEX idx_interview_questions_category ON interview_questions(category);
CREATE INDEX idx_interview_questions_difficulty ON interview_questions(difficulty);

-- Interview Question Tags (join table)
CREATE TABLE interview_question_tags (
    question_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (question_id, tag_id),
    CONSTRAINT fk_interview_question_tags_question FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_interview_question_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_interview_question_tags_tag_id ON interview_question_tags(tag_id);

-- Interview Answers
CREATE TABLE interview_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    answer_text TEXT NOT NULL,
    key_points TEXT,
    example_scenarios TEXT,
    mistakes_to_avoid TEXT,
    question_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_interview_answers_question FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_interview_answers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_interview_answers_question_id ON interview_answers(question_id);
CREATE INDEX idx_interview_answers_user_id ON interview_answers(user_id);

-- Practice Records
CREATE TABLE practice_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practiced_at TIMESTAMP NOT NULL DEFAULT NOW(),
    confidence_score INT,
    self_rating INT,
    notes TEXT,
    time_taken_seconds INT,
    question_id UUID NOT NULL,
    user_id UUID NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_practice_records_question FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE,
    CONSTRAINT fk_practice_records_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_practice_records_question_id ON practice_records(question_id);
CREATE INDEX idx_practice_records_user_id ON practice_records(user_id);
CREATE INDEX idx_practice_records_practiced_at ON practice_records(practiced_at);
