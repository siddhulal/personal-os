import api from "@/lib/api";
import type { WebhookConfig } from "@/types";

export async function fetchWebhooks(): Promise<WebhookConfig[]> {
  const response = await api.get("/api/webhooks");
  return response.data;
}

export async function createWebhook(data: {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive?: boolean;
}): Promise<WebhookConfig> {
  const response = await api.post("/api/webhooks", data);
  return response.data;
}

export async function updateWebhook(id: string, data: {
  name: string;
  url: string;
  secret?: string;
  events: string[];
  isActive?: boolean;
}): Promise<WebhookConfig> {
  const response = await api.put(`/api/webhooks/${id}`, data);
  return response.data;
}

export async function deleteWebhook(id: string): Promise<void> {
  await api.delete(`/api/webhooks/${id}`);
}

export async function testWebhook(id: string): Promise<boolean> {
  const response = await api.post(`/api/webhooks/${id}/test`);
  return response.data.success;
}
