CREATE TABLE canvas_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    canvas_id VARCHAR(255) NOT NULL DEFAULT 'default',
    note_id UUID REFERENCES notes(id),
    label VARCHAR(500),
    content TEXT,
    x DOUBLE PRECISION NOT NULL DEFAULT 0,
    y DOUBLE PRECISION NOT NULL DEFAULT 0,
    width DOUBLE PRECISION NOT NULL DEFAULT 200,
    height DOUBLE PRECISION NOT NULL DEFAULT 100,
    color VARCHAR(50),
    node_type VARCHAR(50) NOT NULL DEFAULT 'note',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP
);
CREATE TABLE canvas_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    canvas_id VARCHAR(255) NOT NULL DEFAULT 'default',
    source_node_id UUID NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES canvas_nodes(id) ON DELETE CASCADE,
    label VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP
);
CREATE INDEX idx_canvas_nodes_user ON canvas_nodes(user_id, canvas_id);
CREATE INDEX idx_canvas_edges_user ON canvas_edges(user_id, canvas_id);
