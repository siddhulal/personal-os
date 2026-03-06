import api from "@/lib/api";
import type { AiSettings, AiConversation, AiGenerateResponse, PageResponse } from "@/types";

// --- Settings ---

export async function fetchAiSettings(): Promise<AiSettings> {
  const response = await api.get("/api/ai/settings");
  return response.data;
}

export async function updateAiSettings(data: Partial<AiSettings> & {
  openaiApiKey?: string;
  geminiApiKey?: string;
}): Promise<AiSettings> {
  const response = await api.put("/api/ai/settings", data);
  return response.data;
}

// --- Conversations ---

export async function fetchConversations(page = 0): Promise<PageResponse<AiConversation>> {
  const response = await api.get(`/api/ai/conversations?page=${page}&size=20`);
  return response.data;
}

export async function fetchConversation(id: string): Promise<AiConversation> {
  const response = await api.get(`/api/ai/conversations/${id}`);
  return response.data;
}

export async function deleteConversation(id: string): Promise<void> {
  await api.delete(`/api/ai/conversations/${id}`);
}

// --- Streaming Chat ---

export function streamChat(
  message: string,
  conversationId: string | null,
  context: string | null,
  onToken: (token: string) => void,
  onDone: (conversationId: string) => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const baseUrl = typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:8080`
    : "http://localhost:8080";

  fetch(`${baseUrl}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ message, conversationId, context }),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        onError(`HTTP error: ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError("No response body");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let currentEvent = "";
        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEvent = line.substring(6).trim();
          } else if (line.startsWith("data:")) {
            const data = line.substring(5);
            if (currentEvent === "done") {
              onDone(data);
            } else if (currentEvent === "error") {
              onError(data);
            } else if (currentEvent === "token" && data) {
              onToken(data);
            }
            currentEvent = "";
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") {
        onError(err.message);
      }
    });

  return controller;
}

// --- Generate ---

export async function generateExamples(topicId: string): Promise<AiGenerateResponse> {
  const response = await api.post(`/api/ai/generate/examples/${topicId}`);
  return response.data;
}

export async function generateDiagram(topicId: string, diagramType = "flowchart"): Promise<AiGenerateResponse> {
  const response = await api.post(`/api/ai/generate/diagram/${topicId}`, { diagramType });
  return response.data;
}

export async function generateInterviewQuestions(
  category: string,
  difficulty: string,
  count: number
): Promise<AiGenerateResponse> {
  const response = await api.post("/api/ai/generate/interview-questions", { category, difficulty, count });
  return response.data;
}

export async function generateInterviewAnswer(questionId: string): Promise<AiGenerateResponse> {
  const response = await api.post(`/api/ai/generate/interview-answer/${questionId}`);
  return response.data;
}

export async function improveAnswer(
  questionId: string,
  answerId: string,
  action: string = "improve"
): Promise<AiGenerateResponse> {
  const response = await api.post(`/api/ai/generate/improve-answer/${questionId}/${answerId}`, { action });
  return response.data;
}

export async function noteAssist(action: string, selectedText: string, context?: string): Promise<AiGenerateResponse> {
  const response = await api.post("/api/ai/generate/note-assist", { action, selectedText, context });
  return response.data;
}

// --- Provider Status ---

export async function fetchProviderStatus(): Promise<Record<string, boolean>> {
  const response = await api.get("/api/ai/providers/status");
  return response.data;
}

export async function fetchOllamaModels(): Promise<string[]> {
  const response = await api.get("/api/ai/ollama/models");
  return response.data;
}

export async function fetchOpenAiModels(): Promise<string[]> {
  const response = await api.get("/api/ai/openai/models");
  return response.data;
}

export async function fetchGeminiModels(): Promise<string[]> {
  const response = await api.get("/api/ai/gemini/models");
  return response.data;
}
