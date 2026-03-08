-- Books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(500),
    description TEXT,
    cover_image_url VARCHAR(1000),
    file_url VARCHAR(1000) NOT NULL,
    file_type VARCHAR(10) NOT NULL DEFAULT 'PDF',
    file_size BIGINT,
    total_pages INT DEFAULT 0,
    current_page INT DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'UNREAD',
    category VARCHAR(50) DEFAULT 'GENERAL',
    rating INT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_books_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_books_status CHECK (status IN ('UNREAD', 'READING', 'COMPLETED', 'ON_HOLD')),
    CONSTRAINT chk_books_file_type CHECK (file_type IN ('PDF', 'EPUB')),
    CONSTRAINT chk_books_rating CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5))
);

CREATE INDEX idx_books_user_id ON books(user_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_category ON books(category);

-- Book tags join table
CREATE TABLE book_tags (
    book_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    PRIMARY KEY (book_id, tag_id),
    CONSTRAINT fk_book_tags_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT fk_book_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_book_tags_tag_id ON book_tags(tag_id);

-- Book highlights table
CREATE TABLE book_highlights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL,
    user_id UUID NOT NULL,
    page_number INT NOT NULL,
    selected_text TEXT NOT NULL,
    ai_response TEXT,
    ai_action_type VARCHAR(20),
    color VARCHAR(20) DEFAULT '#FBBF24',
    note TEXT,
    linked_note_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_book_highlights_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT fk_book_highlights_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_book_highlights_note FOREIGN KEY (linked_note_id) REFERENCES notes(id) ON DELETE SET NULL
);

CREATE INDEX idx_book_highlights_book_id ON book_highlights(book_id);
CREATE INDEX idx_book_highlights_user_id ON book_highlights(user_id);

-- Book bookmarks table
CREATE TABLE book_bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID NOT NULL,
    user_id UUID NOT NULL,
    page_number INT NOT NULL,
    label VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT fk_book_bookmarks_book FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    CONSTRAINT fk_book_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_book_bookmarks_book_id ON book_bookmarks(book_id);
