"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchNoteGraph } from "@/lib/api/notebooks";
import type { NoteGraph } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface KnowledgeGraphProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToNote: (noteId: string) => void;
  currentNoteId?: string | null;
}

interface SimNode {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pinned: boolean;
}

interface SimEdge {
  source: string;
  target: string;
}

const NODE_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#2563eb",
];

function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  return NODE_COLORS[Math.abs(hash) % NODE_COLORS.length];
}

export function KnowledgeGraph({
  open,
  onOpenChange,
  onNavigateToNote,
  currentNoteId,
}: KnowledgeGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<SimEdge[]>([]);
  const animRef = useRef<number>(0);
  const [fullscreen, setFullscreen] = useState(false);

  // Camera state
  const cameraRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{
    type: "node" | "pan" | null;
    nodeId?: string;
    startX: number;
    startY: number;
    camStartX: number;
    camStartY: number;
  }>({ type: null, startX: 0, startY: 0, camStartX: 0, camStartY: 0 });
  const hoveredRef = useRef<string | null>(null);

  const { data: graph } = useQuery<NoteGraph>({
    queryKey: ["note-graph"],
    queryFn: fetchNoteGraph,
    enabled: open,
  });

  // Initialize simulation when graph data changes
  useEffect(() => {
    if (!graph || !open) return;

    const existing = new Map(nodesRef.current.map((n) => [n.id, n]));
    const canvas = canvasRef.current;
    const w = canvas?.width ?? 800;
    const h = canvas?.height ?? 600;

    // Count connections per node for sizing
    const connectionCount = new Map<string, number>();
    graph.edges.forEach((e) => {
      connectionCount.set(e.sourceId, (connectionCount.get(e.sourceId) ?? 0) + 1);
      connectionCount.set(e.targetId, (connectionCount.get(e.targetId) ?? 0) + 1);
    });

    nodesRef.current = graph.nodes.map((n) => {
      const ex = existing.get(n.id);
      const conns = connectionCount.get(n.id) ?? 0;
      const radius = Math.max(6, Math.min(20, 6 + conns * 2));
      if (ex) return { ...ex, title: n.title, radius };
      return {
        id: n.id,
        title: n.title,
        x: w / 2 + (Math.random() - 0.5) * w * 0.6,
        y: h / 2 + (Math.random() - 0.5) * h * 0.6,
        vx: 0,
        vy: 0,
        radius,
        pinned: false,
      };
    });

    edgesRef.current = graph.edges.map((e) => ({
      source: e.sourceId,
      target: e.targetId,
    }));
  }, [graph, open]);

  // Force simulation + render loop
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let coolingFactor = 1;

    function simulate() {
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      if (nodes.length === 0) return;

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));
      const alpha = 0.3 * coolingFactor;
      coolingFactor = Math.max(0.01, coolingFactor * 0.995);

      // Center of mass
      const cx = canvas!.width / 2;
      const cy = canvas!.height / 2;

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          let dx = b.x - a.x;
          let dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 1) { dist = 1; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
          const force = (200 * alpha) / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (!a.pinned) { a.vx -= fx; a.vy -= fy; }
          if (!b.pinned) { b.vx += fx; b.vy += fy; }
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) continue;
        const force = (dist - 120) * 0.005 * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.pinned) { a.vx += fx; a.vy += fy; }
        if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
      }

      // Center gravity
      for (const n of nodes) {
        if (n.pinned) continue;
        n.vx += (cx - n.x) * 0.0005 * alpha;
        n.vy += (cy - n.y) * 0.0005 * alpha;
      }

      // Apply velocity with damping
      for (const n of nodes) {
        if (n.pinned) continue;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
      }
    }

    function render() {
      const w = canvas!.width;
      const h = canvas!.height;
      const cam = cameraRef.current;
      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = "hsl(224, 20%, 6%)";
      ctx!.fillRect(0, 0, w, h);

      ctx!.save();
      ctx!.translate(w / 2, h / 2);
      ctx!.scale(cam.zoom, cam.zoom);
      ctx!.translate(-w / 2 + cam.x, -h / 2 + cam.y);

      // Draw edges
      for (const edge of edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;

        const isHighlighted =
          hoveredRef.current === a.id || hoveredRef.current === b.id ||
          currentNoteId === a.id || currentNoteId === b.id;

        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);
        ctx!.strokeStyle = isHighlighted ? "rgba(99,102,241,0.6)" : "rgba(148,163,184,0.15)";
        ctx!.lineWidth = isHighlighted ? 2 : 1;
        ctx!.stroke();
      }

      // Draw nodes
      for (const n of nodes) {
        const color = hashColor(n.id);
        const isHovered = hoveredRef.current === n.id;
        const isCurrent = currentNoteId === n.id;

        // Glow for current/hovered
        if (isHovered || isCurrent) {
          ctx!.beginPath();
          ctx!.arc(n.x, n.y, n.radius + 6, 0, Math.PI * 2);
          ctx!.fillStyle = isCurrent
            ? "rgba(99,102,241,0.25)"
            : "rgba(255,255,255,0.1)";
          ctx!.fill();
        }

        // Node circle
        ctx!.beginPath();
        ctx!.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx!.fillStyle = isCurrent ? "#6366f1" : color;
        ctx!.fill();

        if (isHovered || isCurrent) {
          ctx!.strokeStyle = "#fff";
          ctx!.lineWidth = 2;
          ctx!.stroke();
        }

        // Label
        ctx!.font = `${isHovered || isCurrent ? "bold " : ""}11px Inter, system-ui, sans-serif`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "top";
        ctx!.fillStyle = isHovered || isCurrent ? "#f1f5f9" : "rgba(203,213,225,0.7)";
        const label = n.title.length > 24 ? n.title.slice(0, 22) + "..." : n.title;
        ctx!.fillText(label, n.x, n.y + n.radius + 4);
      }

      ctx!.restore();

      // Info overlay
      ctx!.font = "12px Inter, system-ui, sans-serif";
      ctx!.fillStyle = "rgba(148,163,184,0.5)";
      ctx!.textAlign = "left";
      ctx!.textBaseline = "top";
      ctx!.fillText(`${nodes.length} notes · ${edges.length} connections`, 12, 12);
    }

    function loop() {
      simulate();
      render();
      animRef.current = requestAnimationFrame(loop);
    }

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [open, currentNoteId]);

  // Resize canvas
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = parent.clientWidth * dpr;
      canvas!.height = parent.clientHeight * dpr;
      canvas!.style.width = parent.clientWidth + "px";
      canvas!.style.height = parent.clientHeight + "px";
      const ctx = canvas!.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas.parentElement!);
    return () => observer.disconnect();
  }, [open, fullscreen]);

  // Screen-to-world coordinates
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: sx, y: sy };
    const rect = canvas.getBoundingClientRect();
    const cam = cameraRef.current;
    const w = rect.width;
    const h = rect.height;
    const x = (sx - rect.left - w / 2) / cam.zoom + w / 2 - cam.x;
    const y = (sy - rect.top - h / 2) / cam.zoom + h / 2 - cam.y;
    return { x, y };
  }, []);

  // Find node at position
  const findNodeAt = useCallback((wx: number, wy: number) => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = wx - n.x;
      const dy = wy - n.y;
      if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n;
    }
    return null;
  }, []);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToWorld(e.clientX, e.clientY);
    const node = findNodeAt(x, y);
    if (node) {
      dragRef.current = { type: "node", nodeId: node.id, startX: e.clientX, startY: e.clientY, camStartX: 0, camStartY: 0 };
      node.pinned = true;
    } else {
      dragRef.current = {
        type: "pan",
        startX: e.clientX,
        startY: e.clientY,
        camStartX: cameraRef.current.x,
        camStartY: cameraRef.current.y,
      };
    }
  }, [screenToWorld, findNodeAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (drag.type === "node" && drag.nodeId) {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const node = nodesRef.current.find((n) => n.id === drag.nodeId);
      if (node) { node.x = x; node.y = y; node.vx = 0; node.vy = 0; }
    } else if (drag.type === "pan") {
      const dx = (e.clientX - drag.startX) / cameraRef.current.zoom;
      const dy = (e.clientY - drag.startY) / cameraRef.current.zoom;
      cameraRef.current.x = drag.camStartX + dx;
      cameraRef.current.y = drag.camStartY + dy;
    } else {
      const { x, y } = screenToWorld(e.clientX, e.clientY);
      const node = findNodeAt(x, y);
      hoveredRef.current = node?.id ?? null;
      if (canvasRef.current) {
        canvasRef.current.style.cursor = node ? "pointer" : "grab";
      }
    }
  }, [screenToWorld, findNodeAt]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (drag.type === "node" && drag.nodeId) {
      const moved = Math.abs(e.clientX - drag.startX) + Math.abs(e.clientY - drag.startY);
      const node = nodesRef.current.find((n) => n.id === drag.nodeId);
      if (node) node.pinned = false;
      if (moved < 5 && drag.nodeId) {
        onNavigateToNote(drag.nodeId);
        onOpenChange(false);
      }
    }
    dragRef.current = { type: null, startX: 0, startY: 0, camStartX: 0, camStartY: 0 };
  }, [onNavigateToNote, onOpenChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    cameraRef.current.zoom = Math.max(0.1, Math.min(5, cameraRef.current.zoom * delta));
  }, []);

  function resetView() {
    cameraRef.current = { x: 0, y: 0, zoom: 1 };
  }

  const emptyState = graph && graph.nodes.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={fullscreen ? "fixed inset-0 max-w-none w-full h-full rounded-none p-0 border-0" : "sm:max-w-[900px] h-[600px] p-0"}
      >
        <div className="flex flex-col h-full">
          <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between shrink-0">
            <DialogTitle className="text-base">Knowledge Graph</DialogTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { cameraRef.current.zoom = Math.min(5, cameraRef.current.zoom * 1.3); }} title="Zoom in">
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { cameraRef.current.zoom = Math.max(0.1, cameraRef.current.zoom * 0.7); }} title="Zoom out">
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={resetView} title="Reset view">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
                {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 relative overflow-hidden">
            {emptyState ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-lg font-medium">No connections yet</p>
                  <p className="text-sm mt-1">Link notes with [[wiki-links]] to build your knowledge graph</p>
                </div>
              </div>
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => { dragRef.current = { type: null, startX: 0, startY: 0, camStartX: 0, camStartY: 0 }; }}
                onWheel={handleWheel}
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
