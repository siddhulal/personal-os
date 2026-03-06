CREATE TABLE cross_module_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    source_type VARCHAR(50) NOT NULL,
    source_id UUID NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id UUID NOT NULL,
    link_type VARCHAR(50) DEFAULT 'RELATED',
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP
);
CREATE INDEX idx_cross_links_user ON cross_module_links(user_id);
CREATE INDEX idx_cross_links_source ON cross_module_links(source_type, source_id);
CREATE INDEX idx_cross_links_target ON cross_module_links(target_type, target_id);
