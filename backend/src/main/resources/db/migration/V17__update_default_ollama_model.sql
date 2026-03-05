-- Update default Ollama model to match locally available model
UPDATE ai_settings SET ollama_model = 'qwen3:14b' WHERE ollama_model = 'llama3.1';
ALTER TABLE ai_settings ALTER COLUMN ollama_model SET DEFAULT 'qwen3:14b';
