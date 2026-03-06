"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ZoomIn,
  ZoomOut,
  Maximize,
  Trash2,
  Move,
  GripHorizontal,
  Check,
  X,
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
import type { CanvasNode, CanvasEdge } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const NODE_W = 240;
const NODE_MIN_H = 90;

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6",
];
const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
interface Rect { x: number; y: number; w: number; h: number }

function getCardRect(n: CanvasNode): Rect {
  return { x: n.x, y: n.y, w: n.width, h: n.height };
}

function edgePoint(rect: Rect, targetCx: number, targetCy: number) {
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const dx = targetCx - cx;
  const dy = targetCy - cy;
  const angle = Math.atan2(dy, dx);
  const absAngle = Math.abs(angle);
  const threshold = Math.atan2(rect.h / 2, rect.w / 2);

  let px: number, py: number, nx: number, ny: number;

  if (absAngle < threshold) {
    px = rect.x + rect.w;
    py = cy + (rect.w / 2) * Math.tan(angle);
    py = Math.max(rect.y + 8, Math.min(rect.y + rect.h - 8, py));
    nx = 1; ny = 0;
  } else if (absAngle > Math.PI - threshold) {
    px = rect.x;
    py = cy - (rect.w / 2) * Math.tan(angle);
    py = Math.max(rect.y + 8, Math.min(rect.y + rect.h - 8, py));
    nx = -1; ny = 0;
  } else if (angle > 0) {
    px = cx + (rect.h / 2) / Math.tan(angle);
    px = Math.max(rect.x + 8, Math.min(rect.x + rect.w - 8, px));
    py = rect.y + rect.h;
    nx = 0; ny = 1;
  } else {
    px = cx - (rect.h / 2) / Math.tan(angle);
    px = Math.max(rect.x + 8, Math.min(rect.x + rect.w - 8, px));
    py = rect.y;
    nx = 0; ny = -1;
  }

  return { px, py, nx, ny };
}

function buildEdgePath(
  sx: number, sy: number, snx: number, sny: number,
  tx: number, ty: number, tnx: number, tny: number,
) {
  const dist = Math.hypot(tx - sx, ty - sy);
  const cp = Math.max(40, Math.min(150, dist * 0.4));
  const c1x = sx + snx * cp;
  const c1y = sy + sny * cp;
  const c2x = tx + tnx * cp;
  const c2y = ty + tny * cp;
  return `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tx} ${ty}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CanvasPage() {
  const qc = useQueryClient();

  // Data
  const { data: nodes = [], isLoading: nl } = useQuery<CanvasNode[]>({
    queryKey: ["canvas-nodes"],
    queryFn: () => fetchCanvasNodes("default"),
  });
  const { data: edges = [], isLoading: el } = useQuery<CanvasEdge[]>({
    queryKey: ["canvas-edges"],
    queryFn: () => fetchCanvasEdges("default"),
  });
  const isLoading = nl || el;

  // Local node mirror for smooth dragging
  const [localNodes, setLocalNodes] = useState<CanvasNode[]>([]);
  useEffect(() => { setLocalNodes(nodes); }, [nodes]);

  // Canvas state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editContent, setEditContent] = useState("");

  // Drag-to-connect state (React state for rendering preview)
  const [connecting, setConnecting] = useState<{
    sourceId: string;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  // ---- Refs for drag operations (direct DOM, no re-renders) ----
  const canvasRef = useRef<HTMLDivElement>(null);
  const transformRef = useRef<HTMLDivElement>(null);
  const nodeRefsMap = useRef<Map<string, HTMLDivElement>>(new Map());
  const rafRef = useRef<number>(0);

  // Interaction refs
  const isPanningRef = useRef(false);
  const draggingIdRef = useRef<string | null>(null);
  const connectingRef = useRef<{ sourceId: string; mouseX: number; mouseY: number } | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const dragPosRef = useRef({ x: 0, y: 0 });

  // "Latest value" refs — so document-level handlers always see current values
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  const localNodesRef = useRef(localNodes);
  useEffect(() => { localNodesRef.current = localNodes; }, [localNodes]);
  const edgesRef = useRef(edges);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  // --- Mutations ---
  const createNodeMut = useMutation({
    mutationFn: createCanvasNode,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["canvas-nodes"] }); },
    onError: () => toast.error("Failed to create card"),
  });
  const updateNodeMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateCanvasNode>[1] }) =>
      updateCanvasNode(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["canvas-nodes"] }); },
    onError: () => toast.error("Failed to update card"),
  });
  const deleteNodeMut = useMutation({
    mutationFn: deleteCanvasNode,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["canvas-nodes"] });
      qc.invalidateQueries({ queryKey: ["canvas-edges"] });
    },
    onError: () => toast.error("Failed to delete card"),
  });
  const createEdgeMut = useMutation({
    mutationFn: createCanvasEdge,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["canvas-edges"] });
      toast.success("Connected");
    },
    onError: () => toast.error("Failed to connect"),
  });
  const createEdgeMutRef = useRef(createEdgeMut);
  useEffect(() => { createEdgeMutRef.current = createEdgeMut; }, [createEdgeMut]);

  const deleteEdgeMut = useMutation({
    mutationFn: deleteCanvasEdge,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["canvas-edges"] });
    },
    onError: () => toast.error("Failed to remove connection"),
  });

  const persistNode = useCallback((node: CanvasNode) => {
    updateNodeMut.mutate({
      id: node.id,
      data: {
        x: Math.round(node.x), y: Math.round(node.y),
        width: node.width, height: node.height,
        label: node.label ?? undefined, content: node.content ?? undefined,
        color: node.color ?? undefined, nodeType: node.nodeType,
      },
    });
  }, [updateNodeMut]);
  const persistNodeRef = useRef(persistNode);
  useEffect(() => { persistNodeRef.current = persistNode; }, [persistNode]);

  // -----------------------------------------------------------------------
  // Canvas-to-world coordinate conversion (uses refs, safe from any context)
  // -----------------------------------------------------------------------
  const clientToCanvas = (clientX: number, clientY: number) => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0 };
    return {
      x: (clientX - r.left - panRef.current.x) / zoomRef.current,
      y: (clientY - r.top - panRef.current.y) / zoomRef.current,
    };
  };

  // -----------------------------------------------------------------------
  // DOCUMENT-LEVEL mousemove + mouseup (the core fix)
  // Registered ONCE. Handlers read from refs so they always have fresh data.
  // -----------------------------------------------------------------------
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      // --- PANNING ---
      if (isPanningRef.current) {
        const nx = panOriginRef.current.x + (e.clientX - panStartRef.current.x);
        const ny = panOriginRef.current.y + (e.clientY - panStartRef.current.y);
        panRef.current = { x: nx, y: ny };
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          if (transformRef.current) {
            transformRef.current.style.transform =
              `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`;
          }
        });
        return;
      }

      // --- NODE DRAG ---
      if (draggingIdRef.current) {
        const z = zoomRef.current;
        const dx = (e.clientX - dragStartRef.current.x) / z;
        const dy = (e.clientY - dragStartRef.current.y) / z;
        const nx = dragOriginRef.current.x + dx;
        const ny = dragOriginRef.current.y + dy;
        dragPosRef.current = { x: nx, y: ny };
        const el = nodeRefsMap.current.get(draggingIdRef.current);
        if (el) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = requestAnimationFrame(() => {
            el.style.left = `${nx}px`;
            el.style.top = `${ny}px`;
          });
        }
        return;
      }

      // --- DRAG-TO-CONNECT (preview line) ---
      if (connectingRef.current) {
        const pos = clientToCanvas(e.clientX, e.clientY);
        cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          if (connectingRef.current) {
            connectingRef.current = { ...connectingRef.current, mouseX: pos.x, mouseY: pos.y };
            setConnecting({ ...connectingRef.current });
          }
        });
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      // --- END PAN ---
      if (isPanningRef.current) {
        isPanningRef.current = false;
        setPan({ ...panRef.current });
        return;
      }

      // --- END NODE DRAG ---
      if (draggingIdRef.current) {
        const nodeId = draggingIdRef.current;
        const pos = { ...dragPosRef.current };
        draggingIdRef.current = null;
        setLocalNodes(prev => {
          const updated = prev.map(n => n.id === nodeId ? { ...n, x: pos.x, y: pos.y } : n);
          const node = updated.find(n => n.id === nodeId);
          if (node) persistNodeRef.current(node);
          return updated;
        });
        return;
      }

      // --- END DRAG-TO-CONNECT ---
      if (connectingRef.current) {
        const conn = connectingRef.current;
        connectingRef.current = null;

        // Hit-test: check every card element's actual bounding rect
        const nodes = localNodesRef.current;
        const currentEdges = edgesRef.current;
        let targetId: string | null = null;

        for (const n of nodes) {
          if (n.id === conn.sourceId) continue;
          const el = nodeRefsMap.current.get(n.id);
          if (el) {
            const rect = el.getBoundingClientRect();
            if (
              e.clientX >= rect.left && e.clientX <= rect.right &&
              e.clientY >= rect.top && e.clientY <= rect.bottom
            ) {
              targetId = n.id;
              break;
            }
          }
        }

        if (targetId) {
          const exists = currentEdges.some(edge =>
            (edge.sourceNodeId === conn.sourceId && edge.targetNodeId === targetId) ||
            (edge.sourceNodeId === targetId && edge.targetNodeId === conn.sourceId)
          );
          if (!exists) {
            createEdgeMutRef.current.mutate({
              canvasId: "default",
              sourceNodeId: conn.sourceId,
              targetNodeId: targetId,
            });
          }
        }

        setConnecting(null);
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []); // Empty deps — handlers use only refs

  // --- Zoom (non-passive wheel) ---
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, prev + (e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP))));
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  // --- Canvas mouseDown (starts pan) ---
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    if (e.button !== 0) return;
    // If connecting and user clicks empty space, cancel
    if (connectingRef.current) {
      connectingRef.current = null;
      setConnecting(null);
      return;
    }
    isPanningRef.current = true;
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOriginRef.current = { ...panRef.current };
    setSelectedId(null);
    setEditingId(null);
  }, []);

  // --- Double-click background to create card ---
  const handleDblClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    const pos = clientToCanvas(e.clientX, e.clientY);
    createNodeMut.mutate({
      canvasId: "default", label: "New Card", content: "",
      x: Math.round(pos.x - NODE_W / 2), y: Math.round(pos.y - NODE_MIN_H / 2),
      width: NODE_W, height: NODE_MIN_H, color: pickColor(), nodeType: "NOTE",
    });
  }, [createNodeMut]);

  // --- Node drag (header mouseDown) ---
  const startNodeDrag = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = localNodes.find(n => n.id === nodeId);
    if (!node) return;
    draggingIdRef.current = nodeId;
    setSelectedId(nodeId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    dragOriginRef.current = { x: node.x, y: node.y };
    dragPosRef.current = { x: node.x, y: node.y };
  }, [localNodes]);

  // --- Port mouseDown (starts drag-to-connect) ---
  const startConnect = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = clientToCanvas(e.clientX, e.clientY);
    const conn = { sourceId: nodeId, mouseX: pos.x, mouseY: pos.y };
    connectingRef.current = conn;
    setConnecting(conn);
  }, []);

  // --- Editing ---
  const startEdit = useCallback((nodeId: string) => {
    const node = localNodes.find(n => n.id === nodeId);
    if (!node) return;
    setEditingId(nodeId);
    setEditLabel(node.label || "");
    setEditContent(node.content || "");
  }, [localNodes]);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const node = localNodes.find(n => n.id === editingId);
    if (!node) return;
    const updated = { ...node, label: editLabel, content: editContent };
    setLocalNodes(prev => prev.map(n => n.id === editingId ? updated : n));
    persistNode(updated);
    setEditingId(null);
  }, [editingId, editLabel, editContent, localNodes, persistNode]);

  // --- Delete ---
  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    deleteNodeMut.mutate(selectedId);
    setSelectedId(null);
    setEditingId(null);
  }, [selectedId, deleteNodeMut]);

  // --- Toolbar ---
  const zoomIn = useCallback(() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP)), []);
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const fitView = useCallback(() => {
    if (localNodes.length === 0) return;
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of localNodes) {
      x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
      x1 = Math.max(x1, n.x + n.width); y1 = Math.max(y1, n.y + n.height);
    }
    const pad = 80;
    const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(r.width / (x1 - x0 + pad * 2), r.height / (y1 - y0 + pad * 2))));
    setPan({ x: r.width / 2 - ((x0 + x1) / 2) * z, y: r.height / 2 - ((y0 + y1) / 2) * z });
    setZoom(z);
  }, [localNodes]);

  const addCard = useCallback(() => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (!r) return;
    const cx = (r.width / 2 - panRef.current.x) / zoomRef.current;
    const cy = (r.height / 2 - panRef.current.y) / zoomRef.current;
    createNodeMut.mutate({
      canvasId: "default", label: "New Card", content: "",
      x: Math.round(cx - NODE_W / 2), y: Math.round(cy - NODE_MIN_H / 2),
      width: NODE_W, height: NODE_MIN_H, color: pickColor(), nodeType: "NOTE",
    });
  }, [createNodeMut]);

  // --- Keyboard ---
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault(); deleteSelected();
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setEditingId(null);
        connectingRef.current = null;
        setConnecting(null);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [selectedId, deleteSelected]);

  // --- Compute edge paths ---
  const nodeMap = useMemo(() => {
    const m = new Map<string, CanvasNode>();
    for (const n of localNodes) m.set(n.id, n);
    return m;
  }, [localNodes]);

  const edgePaths = useMemo(() => edges.map(edge => {
    const src = nodeMap.get(edge.sourceNodeId);
    const tgt = nodeMap.get(edge.targetNodeId);
    if (!src || !tgt) return null;
    const sr = getCardRect(src);
    const tr = getCardRect(tgt);
    const tcx = tr.x + tr.w / 2, tcy = tr.y + tr.h / 2;
    const scx = sr.x + sr.w / 2, scy = sr.y + sr.h / 2;
    const s = edgePoint(sr, tcx, tcy);
    const t = edgePoint(tr, scx, scy);
    const d = buildEdgePath(s.px, s.py, s.nx, s.ny, t.px, t.py, t.nx, t.ny);
    return { id: edge.id, d };
  }), [edges, nodeMap]);

  // --- Live preview edge while connecting ---
  const previewPath = useMemo(() => {
    if (!connecting) return null;
    const src = nodeMap.get(connecting.sourceId);
    if (!src) return null;
    const sr = getCardRect(src);
    const s = edgePoint(sr, connecting.mouseX, connecting.mouseY);
    const dist = Math.hypot(connecting.mouseX - s.px, connecting.mouseY - s.py);
    const cp = Math.max(30, dist * 0.3);
    return `M ${s.px} ${s.py} C ${s.px + s.nx * cp} ${s.py + s.ny * cp}, ${connecting.mouseX} ${connecting.mouseY}, ${connecting.mouseX} ${connecting.mouseY}`;
  }, [connecting, nodeMap]);

  // --- Cursor ---
  const cursor = connecting ? "crosshair" : "grab";

  return (
    <AppShell>
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 bg-card/50">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Canvas</h1>
            <p className="text-xs text-muted-foreground">
              {localNodes.length} cards, {edges.length} connections
              {connecting && <span className="ml-2 text-primary font-medium animate-pulse">Drag to a card to connect...</span>}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomOut}><ZoomOut className="h-3.5 w-3.5" /></Button>
            <span className="text-xs w-10 text-center font-mono">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={zoomIn}><ZoomIn className="h-3.5 w-3.5" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={resetView} title="Reset"><Move className="h-3.5 w-3.5" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={fitView} title="Fit"><Maximize className="h-3.5 w-3.5" /></Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={addCard}><Plus className="h-3.5 w-3.5 mr-1" />Add Card</Button>
            {selectedId && (
              <Button variant="destructive" size="sm" className="h-8 text-xs" onClick={deleteSelected}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
              </Button>
            )}
          </div>
        </div>

        {/* Canvas */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Loading...</div>
        ) : (
          <div
            ref={canvasRef}
            className="flex-1 relative overflow-hidden bg-muted/20 select-none"
            style={{ cursor }}
            onMouseDown={handleCanvasMouseDown}
            onDoubleClick={handleDblClick}
          >
            {/* Grid */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
                backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                backgroundPosition: `${pan.x % (24 * zoom)}px ${pan.y % (24 * zoom)}px`,
              }}
            />

            {/* Transform layer */}
            <div ref={transformRef} className="absolute" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", willChange: "transform" }}>

              {/* SVG for edges */}
              <svg className="absolute top-0 left-0 w-0 h-0" style={{ overflow: "visible", pointerEvents: "none" }}>
                {edgePaths.map(ep => {
                  if (!ep) return null;
                  return (
                    <g key={ep.id}>
                      <path d={ep.d} fill="none" stroke="transparent" strokeWidth={16}
                        style={{ pointerEvents: "stroke", cursor: "pointer" }}
                        onDoubleClick={e => { e.stopPropagation(); deleteEdgeMut.mutate(ep.id); }}
                      />
                      <path d={ep.d} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinecap="round" opacity={0.55} />
                    </g>
                  );
                })}
                {previewPath && (
                  <path d={previewPath} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 4" strokeLinecap="round" opacity={0.7} />
                )}
              </svg>

              {/* Cards */}
              {localNodes.map(node => {
                const isSelected = selectedId === node.id;
                const isEditing = editingId === node.id;
                const color = node.color || "#6366f1";
                const isConnectTarget = connecting && connecting.sourceId !== node.id;

                return (
                  <div
                    key={node.id}
                    data-node
                    ref={el => { if (el) nodeRefsMap.current.set(node.id, el); else nodeRefsMap.current.delete(node.id); }}
                    className={`absolute rounded-xl bg-card border shadow-md
                      ${isSelected ? "ring-2 ring-primary shadow-lg z-10" : "hover:shadow-lg"}
                      ${isConnectTarget ? "ring-2 ring-primary/40 shadow-primary/10 shadow-lg" : ""}
                    `}
                    style={{ left: node.x, top: node.y, width: node.width, minHeight: NODE_MIN_H, willChange: "left, top" }}
                    onClick={e => { e.stopPropagation(); setSelectedId(node.id); }}
                  >
                    {/* Header — drag handle */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl cursor-move select-none"
                      style={{ backgroundColor: color }}
                      onMouseDown={e => { if (!isEditing) startNodeDrag(node.id, e); }}
                      onDoubleClick={e => { e.stopPropagation(); startEdit(node.id); }}
                    >
                      <GripHorizontal className="h-3 w-3 text-white/50 shrink-0" />
                      {isEditing ? (
                        <input
                          className="flex-1 text-sm font-semibold text-white bg-white/20 rounded px-1.5 py-0.5 outline-none placeholder:text-white/50"
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                          onClick={e => e.stopPropagation()}
                          onMouseDown={e => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <span className="text-sm font-semibold text-white truncate flex-1">{node.label || "Untitled"}</span>
                      )}
                    </div>

                    {/* Content */}
                    {isEditing ? (
                      <div className="p-2.5 space-y-2" onClick={e => e.stopPropagation()}>
                        <textarea
                          className="w-full text-sm bg-muted/40 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-primary resize-none"
                          rows={3} value={editContent}
                          onChange={e => setEditContent(e.target.value)}
                          onKeyDown={e => { if (e.key === "Escape") setEditingId(null); }}
                          onMouseDown={e => e.stopPropagation()}
                          placeholder="Write something..."
                        />
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setEditingId(null)}>
                            <X className="h-3 w-3 mr-0.5" />Cancel
                          </Button>
                          <Button size="sm" className="h-6 px-2 text-xs" onClick={saveEdit}>
                            <Check className="h-3 w-3 mr-0.5" />Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="px-3 py-2 text-sm text-muted-foreground leading-relaxed cursor-text min-h-[32px]"
                        onDoubleClick={e => { e.stopPropagation(); startEdit(node.id); }}
                      >
                        {node.content
                          ? <p className="whitespace-pre-wrap">{node.content.length > 180 ? node.content.slice(0, 180) + "..." : node.content}</p>
                          : <p className="italic text-muted-foreground/40 text-xs">Double-click to edit</p>
                        }
                      </div>
                    )}

                    {/* Connection ports */}
                    {!isEditing && (
                      <>
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -right-[7px] w-[14px] h-[14px] rounded-full border-2 bg-card border-muted-foreground/30 hover:bg-primary hover:border-primary hover:scale-150 transition-all cursor-crosshair z-20"
                          onMouseDown={e => startConnect(node.id, e)}
                          title="Drag to connect"
                        />
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -left-[7px] w-[14px] h-[14px] rounded-full border-2 bg-card border-muted-foreground/30 hover:bg-primary hover:border-primary hover:scale-150 transition-all cursor-crosshair z-20"
                          onMouseDown={e => startConnect(node.id, e)}
                          title="Drag to connect"
                        />
                        <div
                          className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-[14px] h-[14px] rounded-full border-2 bg-card border-muted-foreground/30 hover:bg-primary hover:border-primary hover:scale-150 transition-all cursor-crosshair z-20"
                          onMouseDown={e => startConnect(node.id, e)}
                          title="Drag to connect"
                        />
                        <div
                          className="absolute left-1/2 -translate-x-1/2 -top-[7px] w-[14px] h-[14px] rounded-full border-2 bg-card border-muted-foreground/30 hover:bg-primary hover:border-primary hover:scale-150 transition-all cursor-crosshair z-20"
                          onMouseDown={e => startConnect(node.id, e)}
                          title="Drag to connect"
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Empty state */}
            {!isLoading && localNodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">Empty canvas</p>
                  <p className="text-sm mt-1">Double-click anywhere or use Add Card</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
