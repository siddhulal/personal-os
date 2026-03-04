CREATE TABLE entity_tags (
    task_id UUID NOT NULL REFERENCES tasks(id),
    tag_id UUID NOT NULL REFERENCES tags(id),
    PRIMARY KEY (task_id, tag_id)
);
