-- AI Settings per user
CREATE TABLE ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    active_provider VARCHAR(20) NOT NULL DEFAULT 'OLLAMA',
    ollama_base_url VARCHAR(500) DEFAULT 'http://localhost:11434',
    ollama_model VARCHAR(100) DEFAULT 'llama3.1',
    openai_api_key VARCHAR(500),
    openai_model VARCHAR(100) DEFAULT 'gpt-4o',
    gemini_api_key VARCHAR(500),
    gemini_model VARCHAR(100) DEFAULT 'gemini-1.5-flash',
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_settings_user ON ai_settings (user_id);

-- AI Conversations
CREATE TABLE ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL DEFAULT 'New Conversation',
    context VARCHAR(100),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

CREATE INDEX idx_ai_conversations_user ON ai_conversations (user_id);

-- AI Chat Messages
CREATE TABLE ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_chat_messages_conversation ON ai_chat_messages (conversation_id);
