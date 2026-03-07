"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  OnConnect,
  Panel,
  useReactFlow,
  Handle,
  Position,
  NodeProps,
  ConnectionMode,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Viewport,
} from "reactflow";
import "reactflow/dist/style.css";

import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Maximize,
  Check,
  X,
  MoreVertical,
  Lock,
  Unlock,
  ChevronDown,
  Pencil,
  PlusCircle,
  Sparkles,
  Network,
} from "lucide-react";
import {
  fetchCanvasNodes,
  fetchCanvasEdges,
  createCanvasNode,
  updateCanvasNode,
  deleteCanvasNode,
  createCanvasEdge,
  deleteCanvasEdge,
} from "@/lib/api/canvas";
import type {
  CanvasNode as ApiCanvasNode,
  CanvasEdge as ApiCanvasEdge,
} from "@/types";
import { cn } from "@/lib/utils";
import { useAiChat, type PageAiAction } from "@/lib/ai-chat-context";

// ─── Constants ──────────────────────────────────────────────────────────────────

const NODE_WIDTH = 260;
const NODE_HEIGHT = 100;

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6",
];

const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

type EdgeStyleType = "solid" | "dotted" | "animated";

// ─── Canvas List Types ──────────────────────────────────────────────────────────

interface CanvasInfo {
  id: string;
  name: string;
}

const DEFAULT_CANVAS: CanvasInfo = { id: "default", name: "Default Canvas" };

function getCanvasList(): CanvasInfo[] {
  try {
    const raw = localStorage.getItem("canvas-list");
    if (raw) {
      const parsed = JSON.parse(raw) as CanvasInfo[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return [DEFAULT_CANVAS];
}

function saveCanvasList(list: CanvasInfo[]) {
  localStorage.setItem("canvas-list", JSON.stringify(list));
}

// ─── Debounce Helper ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((...args: any[]) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as unknown as T;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function buildEdgeVisuals(edgeType: string | null | undefined): {
  animated: boolean;
  style: React.CSSProperties;
} {
  const base: React.CSSProperties = {
    stroke: "hsl(var(--primary))",
    strokeWidth: 2,
    opacity: 0.7,
  };
  switch (edgeType) {
    case "dotted":
      return { animated: false, style: { ...base, strokeDasharray: "5,5" } };
    case "animated":
      return { animated: true, style: base };
    default:
      return { animated: false, style: base };
  }
}

function apiNodeToFlowNode(
  n: ApiCanvasNode,
  onUpdate: (id: string, updates: Record<string, unknown>) => void
): Node {
  return {
    id: n.id,
    type: "note",
    position: { x: n.x, y: n.y },
    data: {
      label: n.label,
      content: n.content,
      color: n.color,
      onUpdate,
    },
  };
}

function apiEdgeToFlowEdge(e: ApiCanvasEdge): Edge {
  const { animated, style } = buildEdgeVisuals(e.edgeType);
  return {
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    animated,
    style,
    data: { edgeType: e.edgeType || "solid" },
  };
}

function buildFullNodePayload(node: Node, canvasId: string) {
  return {
    canvasId,
    label: node.data.label ?? "",
    content: node.data.content ?? "",
    x: Math.round(node.position.x),
    y: Math.round(node.position.y),
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    color: node.data.color,
    nodeType: "note",
  };
}

// ─── Custom Node Component ──────────────────────────────────────────────────────

const NoteNode = ({ data, id, selected }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || "");
  const [content, setContent] = useState(data.content || "");

  // Sync local state from parent data ONLY when not editing.
  useEffect(() => {
    if (!isEditing) {
      setLabel(data.label || "");
      setContent(data.content || "");
    }
  }, [data.label, data.content, isEditing]);

  const onSave = useCallback(() => {
    data.onUpdate(id, { label, content });
    setIsEditing(false);
  }, [data, id, label, content]);

  const onCancel = useCallback(() => {
    setLabel(data.label || "");
    setContent(data.content || "");
    setIsEditing(false);
  }, [data.label, data.content]);

  const handleClass = cn(
    "!w-3 !h-3 !bg-primary/70 !border-2 !border-background",
    "hover:!scale-150 hover:!bg-primary transition-all !cursor-crosshair",
    "opacity-0 group-hover:opacity-100",
    selected && "opacity-100"
  );

  return (
    <div
      className={cn(
        "bg-card border rounded-xl shadow-md transition-shadow relative group",
        selected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-lg"
      )}
      style={{ minWidth: 240 }}
      onDoubleClick={() => !isEditing && !data.locked && setIsEditing(true)}
    >
      {/* Connection handles -- visible on hover or when selected */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={cn(handleClass, "!-top-1.5")}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={cn(handleClass, "!-bottom-1.5")}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={cn(handleClass, "!-left-1.5")}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={cn(handleClass, "!-right-1.5")}
      />

      {/* Header bar */}
      <div
        className="px-3 py-1.5 flex items-center justify-between gap-2 rounded-t-xl"
        style={{ backgroundColor: data.color || "#6366f1" }}
      >
        {isEditing ? (
          <input
            autoFocus
            className="flex-1 text-sm font-semibold text-white bg-white/20 rounded px-1.5 py-0.5 outline-none border-none placeholder:text-white/50 nodrag"
            value={label}
            placeholder="Card name..."
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave();
              if (e.key === "Escape") onCancel();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm font-semibold text-white truncate">
            {data.label || "Untitled"}
          </span>
        )}
        <div className="flex gap-1 shrink-0">
          {isEditing ? (
            <>
              <button
                onClick={onSave}
                className="text-white hover:bg-white/20 p-0.5 rounded"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onCancel}
                className="text-white hover:bg-white/20 p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <MoreVertical className="h-3.5 w-3.5 text-white/50" />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {isEditing ? (
          <textarea
            className="w-full text-sm bg-muted/40 border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary resize-none nodrag nowheel"
            rows={4}
            value={content}
            placeholder="Add description..."
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap min-h-[40px]">
            {data.content || (
              <span className="italic opacity-40 text-xs">
                Double-click to edit
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// IMPORTANT: Defined outside the component so React Flow doesn't
// re-mount custom nodes on every render.
const nodeTypes = { note: NoteNode };

// ─── Canvas Engine ──────────────────────────────────────────────────────────────

function CanvasEngine({ canvasId }: { canvasId: string }) {
  const { fitView, setViewport, getViewport, getNode, getNodes } =
    useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedEdgeType, setSelectedEdgeType] =
    useState<EdgeStyleType>("solid");

  // ─── Lock state (persisted per canvas) ────────────────────────────────────
  const [locked, setLocked] = useState(() => {
    try {
      return localStorage.getItem(`canvas-locked-${canvasId}`) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem(`canvas-locked-${canvasId}`, String(locked));
  }, [locked, canvasId]);

  // ─── Viewport persistence (debounced) ─────────────────────────────────────
  const savedViewportRef = useRef<Viewport | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`canvas-viewport-${canvasId}`);
      if (raw) {
        savedViewportRef.current = JSON.parse(raw) as Viewport;
      } else {
        savedViewportRef.current = null;
      }
    } catch {
      savedViewportRef.current = null;
    }
  }, [canvasId]);

  const debouncedSaveViewport = useRef(
    debounce((cid: string, vp: Viewport) => {
      localStorage.setItem(`canvas-viewport-${cid}`, JSON.stringify(vp));
    }, 300)
  ).current;

  const onMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      debouncedSaveViewport(canvasId, viewport);
    },
    [canvasId, debouncedSaveViewport]
  );

  const initializedRef = useRef(false);
  const edgesInitializedRef = useRef(false);
  const edgeTypeRef = useRef<EdgeStyleType>("solid");

  // Keep ref in sync so callbacks always read the latest value
  useEffect(() => {
    edgeTypeRef.current = selectedEdgeType;
  }, [selectedEdgeType]);

  // ─── API Queries (fetch per canvasId, no auto-refetch) ────────────────────

  const { data: apiNodes, isSuccess: nodesReady } = useQuery({
    queryKey: ["canvas-nodes", canvasId],
    queryFn: () => fetchCanvasNodes(canvasId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const { data: apiEdges, isSuccess: edgesReady } = useQuery({
    queryKey: ["canvas-edges", canvasId],
    queryFn: () => fetchCanvasEdges(canvasId),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  // ─── Node update handler (passed into node data) ──────────────────────────
  // Uses getNode() to read current position so we ALWAYS send full data
  // to the backend (preventing the x=0, y=0 reset bug).

  const onUpdateNode = useCallback(
    (id: string, updates: Record<string, unknown>) => {
      // 1. Optimistically update React Flow state
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== id) return node;
          return {
            ...node,
            data: { ...node.data, ...updates },
          };
        })
      );

      // 2. Persist to backend with FULL node data (position + everything)
      const currentNode = getNode(id);
      if (currentNode) {
        const payload = buildFullNodePayload(
          {
            ...currentNode,
            data: { ...currentNode.data, ...updates },
          },
          canvasId
        );
        updateCanvasNode(id, payload).catch(() =>
          toast.error("Failed to save changes")
        );
      }
    },
    [setNodes, getNode, canvasId]
  );

  // ─── Initialize nodes from API (ONE TIME per mount) ───────────────────────

  useEffect(() => {
    if (initializedRef.current || !nodesReady || !apiNodes) return;
    initializedRef.current = true;

    const rfNodes = apiNodes.map((n) => apiNodeToFlowNode(n, onUpdateNode));
    setNodes(rfNodes);

    // Restore saved viewport or fitView
    const saved = savedViewportRef.current;
    if (saved) {
      setTimeout(() => setViewport(saved, { duration: 300 }), 200);
    } else if (rfNodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 200);
    }
  }, [nodesReady, apiNodes, onUpdateNode, setNodes, fitView, setViewport]);

  // ─── Initialize edges from API (ONE TIME, after nodes) ────────────────────

  useEffect(() => {
    if (edgesInitializedRef.current || !initializedRef.current) return;
    if (!edgesReady || !apiEdges) return;
    edgesInitializedRef.current = true;

    setEdges(apiEdges.map(apiEdgeToFlowEdge));
  }, [edgesReady, apiEdges, setEdges, nodes]);

  // ─── Mutations ────────────────────────────────────────────────────────────

  const createNodeMut = useMutation({
    mutationFn: createCanvasNode,
    onSuccess: (newNode) => {
      setNodes((nds) => [...nds, apiNodeToFlowNode(newNode, onUpdateNode)]);
      toast.success("Card added");
    },
    onError: () => toast.error("Failed to create card"),
  });

  const deleteNodeMut = useMutation({
    mutationFn: deleteCanvasNode,
    onError: () => toast.error("Failed to delete card"),
  });

  const createEdgeMut = useMutation({
    mutationFn: createCanvasEdge,
    onSuccess: (newEdge) => {
      setEdges((eds) => {
        const withoutTemp = eds.filter(
          (e) =>
            !(
              e.source === newEdge.sourceNodeId &&
              e.target === newEdge.targetNodeId &&
              e.id.startsWith("temp-")
            )
        );
        return [...withoutTemp, apiEdgeToFlowEdge(newEdge)];
      });
    },
    onError: () => {
      setEdges((eds) => eds.filter((e) => !e.id.startsWith("temp-")));
      toast.error("Failed to create connection");
    },
  });

  const deleteEdgeMut = useMutation({
    mutationFn: deleteCanvasEdge,
    onError: () => toast.error("Failed to delete connection"),
  });

  // ─── Event Handlers ──────────────────────────────────────────────────────

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, draggedNode: Node) => {
      const allNodes = getNodes();
      const idsToSave = new Set<string>();
      idsToSave.add(draggedNode.id);
      allNodes.forEach((n) => {
        if (n.selected) idsToSave.add(n.id);
      });

      allNodes
        .filter((n) => idsToSave.has(n.id))
        .forEach((node) => {
          updateCanvasNode(
            node.id,
            buildFullNodePayload(node, canvasId)
          ).catch(() => toast.error("Failed to save position"));
        });
    },
    [getNodes, canvasId]
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      if (!params.source || !params.target) return;

      const duplicate = edges.some(
        (e) =>
          e.source === params.source &&
          e.target === params.target &&
          e.sourceHandle === params.sourceHandle &&
          e.targetHandle === params.targetHandle
      );
      if (duplicate) return;

      const edgeType = edgeTypeRef.current;
      const { animated, style } = buildEdgeVisuals(edgeType);

      const tempEdge: Edge = {
        id: `temp-${Date.now()}`,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        animated,
        style,
        data: { edgeType },
      };
      setEdges((eds) => [...eds, tempEdge]);

      createEdgeMut.mutate({
        canvasId,
        sourceNodeId: params.source,
        targetNodeId: params.target,
        sourceHandle: params.sourceHandle || undefined,
        targetHandle: params.targetHandle || undefined,
        edgeType,
      });
    },
    [createEdgeMut, setEdges, edges, canvasId]
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      deleted.forEach((node) => deleteNodeMut.mutate(node.id));
      const deletedIds = new Set(deleted.map((n) => n.id));
      setEdges((eds) =>
        eds.filter(
          (e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)
        )
      );
    },
    [deleteNodeMut, setEdges]
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      deleted.forEach((edge) => {
        if (!edge.id.startsWith("temp-")) {
          deleteEdgeMut.mutate(edge.id);
        }
      });
    },
    [deleteEdgeMut]
  );

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (!edge.id.startsWith("temp-")) {
        deleteEdgeMut.mutate(edge.id);
      }
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    },
    [deleteEdgeMut, setEdges]
  );

  const onAddCard = useCallback(() => {
    try {
      const { x, y, zoom } = getViewport();
      const centerX = -x / zoom + window.innerWidth / 2 / zoom;
      const centerY = -y / zoom + window.innerHeight / 2 / zoom;

      createNodeMut.mutate({
        canvasId,
        label: "New Card",
        content: "",
        x: Math.round(centerX - NODE_WIDTH / 2),
        y: Math.round(centerY - 50),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        color: pickColor(),
        nodeType: "note",
      });
    } catch {
      createNodeMut.mutate({
        canvasId,
        label: "New Card",
        content: "",
        x: Math.round(Math.random() * 400),
        y: Math.round(Math.random() * 400),
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        color: pickColor(),
        nodeType: "note",
      });
    }
  }, [createNodeMut, getViewport, canvasId]);

  const onDeleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter((n) => n.selected);
    const selectedEdges = edges.filter((e) => e.selected);

    if (selectedNodes.length > 0) {
      onNodesDelete(selectedNodes);
      setNodes((nds) => nds.filter((n) => !n.selected));
    }
    if (selectedEdges.length > 0) {
      onEdgesDelete(selectedEdges);
      setEdges((eds) => eds.filter((e) => !e.selected));
    }
  }, [nodes, edges, onNodesDelete, onEdgesDelete, setNodes, setEdges]);

  const hasSelection =
    nodes.some((n) => n.selected) || edges.some((e) => e.selected);

  // Pass locked state into node data so NoteNode can read it
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, locked },
      }))
    );
  }, [locked, setNodes]);

  // ── AI floating button actions ──────────────────────────────────────────────
  const { setPageActions, clearPageActions, openChat, registerCanvasSaveHandler } = useAiChat();
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // ── Parse AI markdown into canvas nodes & edges ───────────────────────────

  // Try to extract a Mermaid graph block and parse it into nodes + edges
  const parseMermaidGraph = (content: string) => {
    // Extract mermaid code block
    const mermaidMatch = content.match(/```mermaid\s*\n([\s\S]*?)```/);
    if (!mermaidMatch) return null;

    const mermaidCode = mermaidMatch[1];
    // Only handle graph/flowchart diagrams
    if (!/^\s*(graph|flowchart)\s+(TD|TB|LR|RL|BT)/m.test(mermaidCode)) return null;

    const nodeLabels = new Map<string, string>(); // id -> display label
    const edgeList: { source: string; target: string; style: "solid" | "dotted" }[] = [];

    // Set of keywords/directives to skip
    const SKIP_WORDS = new Set([
      "graph", "flowchart", "subgraph", "end", "direction",
      "classDef", "class", "style", "linkStyle", "click",
      "TD", "TB", "LR", "RL", "BT",
    ]);

    const lines = mermaidCode.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith("%%")) continue;

      // Skip full directive lines
      const firstWord = trimmed.split(/[\s([{]/)[0];
      if (SKIP_WORDS.has(firstWord)) continue;

      // Parse edges - many Mermaid edge formats:
      //   A --> B, A -.-> B, A -- text --> B, A -.->|text| B,
      //   A -->|text| B, A ==> B, A -- text --- B
      //   A <|-- B (class-diagram inheritance), A <|.. B (class-diagram implements)
      // Source/target may have node declarations: A["Label"] --> B["Label"]

      // First check for class-diagram operators: A <|-- B or A <|.. B
      const classEdgePattern = /^(\w+)(?:\s*\[["']?([^\]"']*?)["']?\])?\s+(<\|--|<\|\.\.)\s+(\w+)(?:\s*\[["']?([^\]"']*?)["']?\])?/;
      const classEdgeMatch = trimmed.match(classEdgePattern);
      if (classEdgeMatch) {
        const [, srcId, srcLabel, arrow, tgtId, tgtLabel] = classEdgeMatch;
        if (srcLabel) nodeLabels.set(srcId, srcLabel.trim());
        else if (!nodeLabels.has(srcId)) nodeLabels.set(srcId, srcId);
        if (tgtLabel) nodeLabels.set(tgtId, tgtLabel.trim());
        else if (!nodeLabels.has(tgtId)) nodeLabels.set(tgtId, tgtId);

        edgeList.push({
          source: srcId,
          target: tgtId,
          style: arrow === "<|.." ? "dotted" : "solid",
        });
        continue;
      }

      // Standard flowchart edge patterns
      const edgePattern = /^(\w+)(?:\s*\[["']?([^\]"']*?)["']?\])?\s+(?:--[^->]*-->|--+>|-.->|==+>|--[^->]*---|-->|-.->)\s*(?:\|[^|]*\|)?\s*(\w+)(?:\s*\[["']?([^\]"']*?)["']?\])?/;
      const edgeMatch = trimmed.match(edgePattern);
      if (edgeMatch) {
        const [, srcId, srcLabel, tgtId, tgtLabel] = edgeMatch;
        if (srcLabel) nodeLabels.set(srcId, srcLabel.trim());
        else if (!nodeLabels.has(srcId)) nodeLabels.set(srcId, srcId);
        if (tgtLabel) nodeLabels.set(tgtId, tgtLabel.trim());
        else if (!nodeLabels.has(tgtId)) nodeLabels.set(tgtId, tgtId);

        // Determine edge style: dotted if the line contains -.->
        const isDotted = /-.->/.test(trimmed);
        edgeList.push({
          source: srcId,
          target: tgtId,
          style: isDotted ? "dotted" : "solid",
        });
        continue;
      }

      // Parse standalone node declarations: A[Label] or A(Label) or A{Label} or A["Label"]
      const nodePattern = /^(\w+)\s*[\[({]["']?([^\])}"']+?)["']?[\])}]\s*$/;
      const nodeMatch = trimmed.match(nodePattern);
      if (nodeMatch) {
        nodeLabels.set(nodeMatch[1], nodeMatch[2].trim());
        continue;
      }

      // Parse bare node identifiers (e.g., standalone "ArrayList" inside a subgraph)
      // Must be a single word with no special characters, starting with uppercase
      const bareNodeMatch = trimmed.match(/^([A-Z]\w*)$/);
      if (bareNodeMatch && !SKIP_WORDS.has(bareNodeMatch[1])) {
        if (!nodeLabels.has(bareNodeMatch[1])) {
          nodeLabels.set(bareNodeMatch[1], bareNodeMatch[1]);
        }
      }
    }

    if (nodeLabels.size === 0) return null;

    // Detect interface nodes from labels containing "(Interface)" or "<<Interface>>"
    const interfaceIds = new Set<string>();
    nodeLabels.forEach((label, id) => {
      if (/\binterface\b/i.test(label) || /<<\s*Interface\s*>>/i.test(label)) {
        interfaceIds.add(id);
      }
    });

    // Clean up labels: remove "(Interface)", "(Class)", "<<Interface>>", "<<Class>>" notations
    nodeLabels.forEach((label, id) => {
      const cleaned = label
        .replace(/\s*\((Interface|Class)\)\s*/gi, "")
        .replace(/<<\s*(Interface|Class)\s*>>\s*/gi, "")
        .trim();
      if (cleaned) nodeLabels.set(id, cleaned);
    });

    return { nodeLabels, edgeList, interfaceIds };
  };

  // Layout nodes in a tree/hierarchy using BFS from roots
  const layoutNodes = (
    nodeLabels: Map<string, string>,
    edgeList: { source: string; target: string; style: "solid" | "dotted" }[],
    startX: number,
    startY: number
  ) => {
    const GAP_X = 300;
    const GAP_Y = 180;

    // Build adjacency for children
    const children = new Map<string, string[]>();
    const hasParent = new Set<string>();
    for (const e of edgeList) {
      if (!children.has(e.source)) children.set(e.source, []);
      children.get(e.source)!.push(e.target);
      hasParent.add(e.target);
    }

    // Find root nodes (no incoming edges)
    const allIds = Array.from(nodeLabels.keys());
    const roots = allIds.filter((id) => !hasParent.has(id));
    if (roots.length === 0 && allIds.length > 0) roots.push(allIds[0]);

    // BFS to assign levels
    const levels = new Map<string, number>();
    const queue = roots.map((r) => ({ id: r, level: 0 }));
    const visited = new Set<string>();
    for (const r of roots) {
      levels.set(r, 0);
      visited.add(r);
    }

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      const kids = children.get(id) || [];
      for (const kid of kids) {
        if (!visited.has(kid)) {
          visited.add(kid);
          levels.set(kid, level + 1);
          queue.push({ id: kid, level: level + 1 });
        }
      }
    }

    // Assign levels to any unvisited nodes
    Array.from(nodeLabels.keys()).forEach((id) => {
      if (!levels.has(id)) levels.set(id, 0);
    });

    // Group by level
    const byLevel = new Map<number, string[]>();
    levels.forEach((level, id) => {
      if (!byLevel.has(level)) byLevel.set(level, []);
      byLevel.get(level)!.push(id);
    });

    // Position: each level is a row, nodes spread horizontally
    const positions = new Map<string, { x: number; y: number }>();
    const maxLevel = Math.max(...Array.from(byLevel.keys()));
    for (let level = 0; level <= maxLevel; level++) {
      const nodesAtLevel = byLevel.get(level) || [];
      const totalWidth = (nodesAtLevel.length - 1) * GAP_X;
      const offsetX = startX - totalWidth / 2;
      nodesAtLevel.forEach((id, idx) => {
        positions.set(id, {
          x: Math.round(offsetX + idx * GAP_X),
          y: Math.round(startY + level * GAP_Y),
        });
      });
    }

    return positions;
  };

  // Fallback: parse markdown headings/bullets into flat node list
  const parseMarkdownItems = (content: string) => {
    const items: { label: string; content: string }[] = [];
    const lines = content.split("\n");
    let currentHeading = "";
    let currentLines: string[] = [];
    let inCodeBlock = false;

    const flushHeading = () => {
      if (currentHeading) {
        const bodyText = currentLines
          .join("\n")
          .replace(/```[\s\S]*?```/g, "") // strip code blocks from content
          .trim();
        items.push({ label: currentHeading, content: bodyText });
        currentLines = [];
      }
    };

    for (const line of lines) {
      const trimmed = line.trim();

      // Track code blocks so we skip them for heading detection
      if (trimmed.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        if (currentHeading) currentLines.push(line);
        continue;
      }
      if (inCodeBlock) {
        if (currentHeading) currentLines.push(line);
        continue;
      }

      // Match headings: # Title, ## Title, ### Title
      const headingMatch = trimmed.match(/^#{1,4}\s+(.+)/);
      if (headingMatch) {
        flushHeading();
        currentHeading = headingMatch[1].replace(/\*\*/g, "").trim();
        continue;
      }

      // Match numbered section headers: "1. Title" or "2. Title" at top level
      const numberedHeadingMatch = trimmed.match(/^\d+\.\s+\*\*(.+?)\*\*/);
      if (numberedHeadingMatch && !currentHeading) {
        flushHeading();
        currentHeading = numberedHeadingMatch[1].trim();
        continue;
      }

      // Match standalone bold lines as section titles: **Title**
      const boldMatch = trimmed.match(/^\*\*(.+?)\*\*\s*$/);
      if (boldMatch && !trimmed.startsWith("-") && !trimmed.startsWith("*")) {
        flushHeading();
        currentHeading = boldMatch[1].trim();
        continue;
      }

      // Any other non-empty line: accumulate under current heading
      if (trimmed && currentHeading) {
        // Clean up markdown artifacts for readable content
        currentLines.push(
          trimmed
            .replace(/^\*\*(.+?)\*\*:?\s*/, "$1: ") // **Bold**: -> Bold:
            .replace(/\*\*/g, "")
        );
      }
    }
    flushHeading();
    return items;
  };

  const handleSaveAsCanvas = useCallback(
    async (content: string) => {
      // Get viewport center for positioning
      let centerX = 600;
      let centerY = 100;
      try {
        const { x, y, zoom } = getViewport();
        centerX = -x / zoom + window.innerWidth / 2 / zoom;
        centerY = -y / zoom + 100;
      } catch {
        // fallback
      }

      // Try Mermaid graph parsing first
      const mermaid = parseMermaidGraph(content);

      if (mermaid && mermaid.nodeLabels.size > 0) {
        // ── Mermaid mode: create nodes from diagram definition ──────────
        const { nodeLabels, edgeList, interfaceIds } = mermaid;
        const positions = layoutNodes(nodeLabels, edgeList, centerX, centerY);

        // Use interface detection from parser + classDef fallback
        const interfaceNodes = new Set<string>(interfaceIds);
        const mermaidBlock = content.match(/```mermaid\s*\n([\s\S]*?)```/)?.[1] || "";
        // Also detect from classDef/class directives
        const classRegex = /^\s*class\s+([^\s]+)\s+(\w+)/gm;
        let classMatchResult: RegExpExecArray | null;
        while ((classMatchResult = classRegex.exec(mermaidBlock)) !== null) {
          if (classMatchResult[2] === "interface") {
            classMatchResult[1].split(",").forEach((n) => interfaceNodes.add(n.trim()));
          }
        }

        toast.info(`Creating ${nodeLabels.size} nodes from diagram...`);

        // Create nodes
        const idToCreated = new Map<string, ApiCanvasNode>();
        let colorIdx = 0;
        const nodeEntries = Array.from(nodeLabels.entries());
        for (const [nodeId, label] of nodeEntries) {
          const pos = positions.get(nodeId) || { x: 0, y: 0 };
          const isInterface = interfaceNodes.has(nodeId);
          const color = isInterface ? "#3b82f6" : COLORS[colorIdx % COLORS.length];
          colorIdx++;
          try {
            const created = await createCanvasNode({
              canvasId,
              label: label.slice(0, 100),
              content: isInterface ? "Interface" : "Class",
              x: pos.x,
              y: pos.y,
              width: NODE_WIDTH,
              height: NODE_HEIGHT,
              color,
              nodeType: "note",
            });
            idToCreated.set(nodeId, created);
          } catch {
            toast.error(`Failed to create: ${label}`);
          }
        }

        // Add to canvas
        if (idToCreated.size > 0) {
          setNodes((nds) => [
            ...nds,
            ...Array.from(idToCreated.values()).map((n) => apiNodeToFlowNode(n, onUpdateNode)),
          ]);

          // Create edges from the mermaid relationships
          for (const edge of edgeList) {
            const src = idToCreated.get(edge.source);
            const tgt = idToCreated.get(edge.target);
            if (!src || !tgt) continue;
            try {
              const created = await createCanvasEdge({
                canvasId,
                sourceNodeId: src.id,
                targetNodeId: tgt.id,
                sourceHandle: "bottom",
                targetHandle: "top",
                edgeType: edge.style === "dotted" ? "dotted" : "solid",
              });
              setEdges((eds) => [...eds, apiEdgeToFlowEdge(created)]);
            } catch {
              // edges are optional
            }
          }

          toast.success(`Added ${idToCreated.size} nodes and ${edgeList.length} connections`);
          setTimeout(() => fitView({ padding: 0.15, duration: 500 }), 300);
        }
      } else {
        // ── Fallback: markdown heading/bullet parsing ───────────────────
        let items = parseMarkdownItems(content);
        if (items.length === 0) {
          const firstLine = content.split("\n").find((l) => l.trim()) || "AI Response";
          items = [{
            label: firstLine.replace(/^#+\s*/, "").replace(/\*\*/g, "").slice(0, 60),
            content: content.slice(0, 500),
          }];
        }

        const COLS = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(items.length))));
        const GAP_X = 320;
        const GAP_Y = 200;

        toast.info(`Creating ${items.length} canvas nodes...`);

        const createdNodes: ApiCanvasNode[] = [];
        for (let i = 0; i < items.length; i++) {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          try {
            const newNode = await createCanvasNode({
              canvasId,
              label: items[i].label.slice(0, 100),
              content: items[i].content.slice(0, 1000),
              x: Math.round(centerX - ((COLS - 1) * GAP_X) / 2 + col * GAP_X),
              y: Math.round(centerY + row * GAP_Y),
              width: NODE_WIDTH,
              height: NODE_HEIGHT,
              color: COLORS[i % COLORS.length],
              nodeType: "note",
            });
            createdNodes.push(newNode);
          } catch {
            toast.error(`Failed to create node: ${items[i].label}`);
          }
        }

        if (createdNodes.length > 0) {
          setNodes((nds) => [
            ...nds,
            ...createdNodes.map((n) => apiNodeToFlowNode(n, onUpdateNode)),
          ]);

          for (let i = 0; i < createdNodes.length - 1; i++) {
            try {
              const newEdge = await createCanvasEdge({
                canvasId,
                sourceNodeId: createdNodes[i].id,
                targetNodeId: createdNodes[i + 1].id,
                sourceHandle: "bottom",
                targetHandle: "top",
                edgeType: "solid",
              });
              setEdges((eds) => [...eds, apiEdgeToFlowEdge(newEdge)]);
            } catch {
              // edges are optional
            }
          }

          toast.success(`Added ${createdNodes.length} nodes to canvas`);
          setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 300);
        }
      }
    },
    [canvasId, getViewport, setNodes, setEdges, onUpdateNode, fitView]
  );

  // Register the canvas save handler so the AI sidebar can use it
  useEffect(() => {
    registerCanvasSaveHandler(handleSaveAsCanvas);
    return () => registerCanvasSaveHandler(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSaveAsCanvas]);

  useEffect(() => {
    const actions: PageAiAction[] = [
      {
        label: "Generate Canvas from Topic",
        action: "generate_canvas_from_topic",
        icon: Network,
        onAction: () => {
          openChat(
            "Generate a visual diagram for the topic I'll describe. ALWAYS include a Mermaid diagram using ```mermaid with graph TD syntax showing the hierarchy/relationships. Use --> for inheritance/extends and -.-> for implements. Each node should be a separate entity (class, interface, concept, etc). Keep explanations minimal - the diagram is the main output. I can save your Mermaid diagram directly as interactive canvas nodes. What topic would you like diagrammed?"
          );
        },
      },
      {
        label: "Expand Selected Node",
        action: "expand_selected_node",
        icon: Sparkles,
        onAction: () => {
          const selectedNode = nodesRef.current.find((n) => n.selected);
          const context = selectedNode
            ? `Expand on this canvas node. Generate a Mermaid diagram (graph TD) showing 3-5 related sub-topics branching from "${selectedNode.data.label || "Untitled"}". Use --> for relationships. Each sub-topic should be its own node.\n\nCurrent node: ${selectedNode.data.label || "Untitled"}\nContent: ${selectedNode.data.content || "N/A"}`
            : "Select a node on the canvas first, then use this action to expand it with related child nodes. Or describe a topic to expand.";
          openChat(context);
        },
      },
    ];
    setPageActions(actions);
    return () => clearPageActions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={locked ? undefined : onConnect}
      onNodesDelete={locked ? undefined : onNodesDelete}
      onEdgesDelete={locked ? undefined : onEdgesDelete}
      onEdgeDoubleClick={locked ? undefined : onEdgeDoubleClick}
      onNodeDragStop={onNodeDragStop}
      onMoveEnd={onMoveEnd}
      nodeTypes={nodeTypes}
      nodesDraggable={!locked}
      nodesConnectable={!locked}
      connectionMode={ConnectionMode.Loose}
      snapToGrid
      snapGrid={[15, 15]}
      deleteKeyCode={locked ? [] : ["Backspace", "Delete"]}
      multiSelectionKeyCode={["Meta", "Control"]}
      selectionKeyCode="Shift"
      proOptions={{ hideAttribution: true }}
    >
      <Background gap={20} size={1} color="hsl(var(--border))" />
      <Controls />

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Panel
        position="top-right"
        className="flex items-center gap-2 bg-background/80 backdrop-blur p-1.5 rounded-lg border shadow-sm"
      >
        {/* Lock / Unlock toggle */}
        <Button
          variant={locked ? "secondary" : "outline"}
          size="sm"
          onClick={() => setLocked((prev) => !prev)}
          className="h-8 text-xs font-medium"
          title={locked ? "Unlock canvas" : "Lock canvas"}
        >
          {locked ? (
            <Lock className="h-3.5 w-3.5 mr-1.5" />
          ) : (
            <Unlock className="h-3.5 w-3.5 mr-1.5" />
          )}
          {locked ? "Locked" : "Unlocked"}
        </Button>

        <div className="w-px h-5 bg-border" />

        {/* Edge type selector: Solid | Dotted | Flowing */}
        <div className="flex bg-muted/50 rounded-md p-0.5">
          {(["solid", "dotted", "animated"] as EdgeStyleType[]).map((type) => (
            <Button
              key={type}
              variant={selectedEdgeType === type ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2 text-[10px] capitalize"
              onClick={() => setSelectedEdgeType(type)}
            >
              {type === "animated" ? "Flowing" : type}
            </Button>
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        <Button
          variant="outline"
          size="sm"
          onClick={onAddCard}
          className="h-8 text-xs font-medium"
          disabled={createNodeMut.isPending || locked}
        >
          {createNodeMut.isPending ? (
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1.5" />
          ) : (
            <Plus className="h-3.5 w-3.5 mr-1.5" />
          )}
          Add Card
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fitView({ padding: 0.2, duration: 500 })}
          className="h-8 text-xs font-medium"
        >
          <Maximize className="h-3.5 w-3.5 mr-1.5" />
          Fit
        </Button>

        <div className="w-px h-5 bg-border" />

        <Button
          variant="outline"
          size="sm"
          disabled={locked}
          onClick={() => {
            if (!hasSelection) {
              toast.info("Select nodes or edges to delete");
              return;
            }
            onDeleteSelected();
          }}
          className="h-8 text-xs font-medium border-destructive/50 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Delete
        </Button>
      </Panel>

      {/* ── Info panel ──────────────────────────────────────────────────── */}
      <Panel
        position="top-left"
        className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border shadow-sm"
      >
        <h1 className="text-sm font-bold tracking-tight">Personal Canvas</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
          {nodes.length} cards &bull; {edges.length} links
          {locked && <span className="ml-2 text-amber-500">LOCKED</span>}
        </p>
      </Panel>
    </ReactFlow>
  );
}

// ─── Canvas Selector ────────────────────────────────────────────────────────────

function CanvasSelector({
  canvasList,
  activeCanvasId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: {
  canvasList: CanvasInfo[];
  activeCanvasId: string;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as HTMLElement)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const activeCanvas = canvasList.find((c) => c.id === activeCanvasId);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className="h-8 text-xs font-medium gap-1.5 max-w-[200px] bg-background/80 backdrop-blur shadow-sm"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="truncate">{activeCanvas?.name || "Canvas"}</span>
        <ChevronDown className="h-3 w-3 shrink-0" />
      </Button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-64 bg-popover border rounded-lg shadow-lg p-1">
          <div className="max-h-60 overflow-y-auto">
            {canvasList.map((canvas) => (
              <div
                key={canvas.id}
                className={cn(
                  "flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer group",
                  canvas.id === activeCanvasId
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                onClick={() => {
                  onSelect(canvas.id);
                  setOpen(false);
                }}
              >
                <span className="truncate font-medium">{canvas.name}</span>
                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    className="p-0.5 rounded hover:bg-background"
                    title="Rename"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename(canvas.id);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  {canvas.id !== "default" && (
                    <button
                      className="p-0.5 rounded hover:bg-destructive/10 text-destructive"
                      title="Delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(canvas.id);
                        setOpen(false);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="border-t mt-1 pt-1">
            <button
              className="flex items-center gap-1.5 w-full px-2 py-1.5 rounded-md text-xs hover:bg-muted font-medium"
              onClick={() => {
                onCreate();
                setOpen(false);
              }}
            >
              <PlusCircle className="h-3.5 w-3.5" />
              New Canvas
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function CanvasContent() {
  const [canvasList, setCanvasList] = useState<CanvasInfo[]>(getCanvasList);
  const [activeCanvasId, setActiveCanvasId] = useState<string>(() => {
    try {
      return localStorage.getItem("canvas-active") || "default";
    } catch {
      return "default";
    }
  });

  // Persist active canvas
  useEffect(() => {
    localStorage.setItem("canvas-active", activeCanvasId);
  }, [activeCanvasId]);

  // Persist canvas list
  useEffect(() => {
    saveCanvasList(canvasList);
  }, [canvasList]);

  const handleCreate = useCallback(() => {
    const name = prompt("Enter canvas name:");
    if (!name?.trim()) return;
    const id = crypto.randomUUID();
    setCanvasList((prev) => [...prev, { id, name: name.trim() }]);
    setActiveCanvasId(id);
  }, []);

  const handleRename = useCallback((id: string) => {
    const current = getCanvasList().find((c) => c.id === id);
    const name = prompt("Rename canvas:", current?.name || "");
    if (!name?.trim()) return;
    setCanvasList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: name.trim() } : c))
    );
  }, []);

  const handleDelete = useCallback((id: string) => {
    if (id === "default") return;
    const canvas = getCanvasList().find((c) => c.id === id);
    if (!confirm(`Delete canvas "${canvas?.name}"? This cannot be undone.`))
      return;
    setCanvasList((prev) => prev.filter((c) => c.id !== id));
    setActiveCanvasId((current) => (current === id ? "default" : current));
    // Clean up localStorage for the deleted canvas
    try {
      localStorage.removeItem(`canvas-viewport-${id}`);
      localStorage.removeItem(`canvas-locked-${id}`);
    } catch {
      /* ignore */
    }
  }, []);

  // Key on ReactFlowProvider forces remount when switching canvases,
  // ensuring clean state for each canvas.
  return (
    <div className="relative w-full h-full">
      {/* Canvas selector bar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
        <CanvasSelector
          canvasList={canvasList}
          activeCanvasId={activeCanvasId}
          onSelect={setActiveCanvasId}
          onCreate={handleCreate}
          onRename={handleRename}
          onDelete={handleDelete}
        />
      </div>
      <ReactFlowProvider key={activeCanvasId}>
        <CanvasEngine canvasId={activeCanvasId} />
      </ReactFlowProvider>
    </div>
  );
}
