import api from "@/lib/api";
import type { CanvasNode, CanvasEdge } from "@/types";

export async function fetchCanvasNodes(canvasId = "default"): Promise<CanvasNode[]> {
  const response = await api.get(`/api/canvas/nodes?canvasId=${encodeURIComponent(canvasId)}`);
  return response.data;
}

export async function fetchCanvasEdges(canvasId = "default"): Promise<CanvasEdge[]> {
  const response = await api.get(`/api/canvas/edges?canvasId=${encodeURIComponent(canvasId)}`);
  return response.data;
}

export async function createCanvasNode(data: {
  canvasId?: string;
  noteId?: string;
  label?: string;
  content?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  nodeType?: string;
}): Promise<CanvasNode> {
  const response = await api.post("/api/canvas/nodes", data);
  return response.data;
}

export async function updateCanvasNode(id: string, data: {
  canvasId?: string;
  noteId?: string;
  label?: string;
  content?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  color?: string;
  nodeType?: string;
}): Promise<CanvasNode> {
  const response = await api.put(`/api/canvas/nodes/${id}`, data);
  return response.data;
}

export async function deleteCanvasNode(id: string): Promise<void> {
  await api.delete(`/api/canvas/nodes/${id}`);
}

export async function createCanvasEdge(data: {
  canvasId?: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string;
  edgeType?: string;
  sourceHandle?: string;
  targetHandle?: string;
}): Promise<CanvasEdge> {
  const response = await api.post("/api/canvas/edges", data);
  return response.data;
}

export async function deleteCanvasEdge(id: string): Promise<void> {
  await api.delete(`/api/canvas/edges/${id}`);
}
