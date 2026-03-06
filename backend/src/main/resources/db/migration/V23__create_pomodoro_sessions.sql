CREATE TABLE pomodoro_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    task_id UUID REFERENCES tasks(id),
    duration_minutes INT NOT NULL DEFAULT 25,
    break_minutes INT NOT NULL DEFAULT 5,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    deleted_at TIMESTAMP
);
CREATE INDEX idx_pomodoro_sessions_user ON pomodoro_sessions(user_id);
CREATE INDEX idx_pomodoro_sessions_task ON pomodoro_sessions(task_id);
