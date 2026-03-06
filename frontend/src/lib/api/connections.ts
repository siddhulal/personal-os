import api from "@/lib/api";
import type { CrossModuleLink } from "@/types";

export async function fetchConnectionsForEntity(entityType: string, entityId: string): Promise<CrossModuleLink[]> {
  const response = await api.get(`/api/connections/${entityType}/${entityId}`);
  return response.data;
}

export async function fetchAllConnections(): Promise<CrossModuleLink[]> {
  const response = await api.get("/api/connections");
  return response.data;
}

export async function createConnection(data: {
  sourceType: string;
  sourceId: string;
  targetType: string;
  targetId: string;
  linkType?: string;
}): Promise<CrossModuleLink> {
  const response = await api.post("/api/connections", data);
  return response.data;
}

export async function deleteConnection(id: string): Promise<void> {
  await api.delete(`/api/connections/${id}`);
}
