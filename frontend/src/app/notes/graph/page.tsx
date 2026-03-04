"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchNoteGraph } from "@/lib/api/notebooks";
import type { NoteGraph } from "@/types";

interface SimNode {
  id: string;
  title: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface SimEdge {
  sourceId: string;
  targetId: string;
}

export default function KnowledgeGraphPage() {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const [nodes, setNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<SimEdge[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const { data: graph, isLoading } = useQuery<NoteGraph>({
    queryKey: ["note-graph"],
    queryFn: fetchNoteGraph,
  });

  // Initialize simulation nodes
  useEffect(() => {
    if (!graph) return;
    const width = 800;
    const height = 600;

    const simNodes: SimNode[] = graph.nodes.map((n, i) => ({
      id: n.id,
      title: n.title,
      x: width / 2 + (Math.random() - 0.5) * 300,
      y: height / 2 + (Math.random() - 0.5) * 300,
      vx: 0,
      vy: 0,
    }));

    setNodes(simNodes);
    setEdges(graph.edges.map((e) => ({ sourceId: e.sourceId, targetId: e.targetId })));
  }, [graph]);

  // Force simulation
  const simulate = useCallback(() => {
    setNodes((prevNodes) => {
      if (prevNodes.length === 0) return prevNodes;

      const newNodes = prevNodes.map((n) => ({ ...n }));
      const width = 800;
      const height = 600;

      // Repulsion between all nodes
      for (let i = 0; i < newNodes.length; i++) {
        for (let j = i + 1; j < newNodes.length; j++) {
          const dx = newNodes[j].x - newNodes[i].x;
          const dy = newNodes[j].y - newNodes[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 2000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          newNodes[i].vx -= fx;
          newNodes[i].vy -= fy;
          newNodes[j].vx += fx;
          newNodes[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const source = newNodes.find((n) => n.id === edge.sourceId);
        const target = newNodes.find((n) => n.id === edge.targetId);
        if (!source || !target) continue;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = (dist - 120) * 0.01;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }

      // Center gravity
      for (const node of newNodes) {
        node.vx += (width / 2 - node.x) * 0.001;
        node.vy += (height / 2 - node.y) * 0.001;
      }

      // Apply velocities with damping
      for (const node of newNodes) {
        if (node.id === draggedNode) continue;
        node.vx *= 0.85;
        node.vy *= 0.85;
        node.x += node.vx;
        node.y += node.vy;
        node.x = Math.max(40, Math.min(width - 40, node.x));
        node.y = Math.max(40, Math.min(height - 40, node.y));
      }

      return newNodes;
    });

    animRef.current = requestAnimationFrame(simulate);
  }, [edges, draggedNode]);

  useEffect(() => {
    if (nodes.length > 0) {
      animRef.current = requestAnimationFrame(simulate);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes.length > 0, simulate]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!draggedNode || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - dragOffset.current.x;
      const y = e.clientY - rect.top - dragOffset.current.y;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === draggedNode ? { ...n, x, y, vx: 0, vy: 0 } : n
        )
      );
    },
    [draggedNode]
  );

  const handleMouseDown = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      dragOffset.current = {
        x: e.clientX - rect.left - node.x,
        y: e.clientY - rect.top - node.y,
      };
      setDraggedNode(nodeId);
    },
    [nodes]
  );

  const handleMouseUp = useCallback(() => {
    setDraggedNode(null);
  }, []);

  const getNodeById = (id: string) => nodes.find((n) => n.id === id);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Graph</h1>
          <p className="text-muted-foreground mt-1">
            Visual map of connected notes ({nodes.length} notes, {edges.length} links)
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Note Connections</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[600px] flex items-center justify-center">
                <p className="text-muted-foreground">Loading graph...</p>
              </div>
            ) : nodes.length === 0 ? (
              <div className="h-[600px] flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <p className="text-lg font-medium">No linked notes yet</p>
                  <p className="text-sm mt-1">
                    Use [[wiki links]] in your notes to create connections
                  </p>
                </div>
              </div>
            ) : (
              <svg
                ref={svgRef}
                width="100%"
                height="600"
                viewBox="0 0 800 600"
                className="bg-muted/20 rounded-lg cursor-grab active:cursor-grabbing"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Edges */}
                {edges.map((edge, i) => {
                  const source = getNodeById(edge.sourceId);
                  const target = getNodeById(edge.targetId);
                  if (!source || !target) return null;
                  const isHighlighted =
                    hoveredNode === edge.sourceId || hoveredNode === edge.targetId;
                  return (
                    <line
                      key={i}
                      x1={source.x}
                      y1={source.y}
                      x2={target.x}
                      y2={target.y}
                      stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--border))"}
                      strokeWidth={isHighlighted ? 2 : 1}
                      opacity={hoveredNode && !isHighlighted ? 0.2 : 0.6}
                    />
                  );
                })}
                {/* Nodes */}
                {nodes.map((node) => {
                  const isHovered = hoveredNode === node.id;
                  const isConnected =
                    hoveredNode &&
                    edges.some(
                      (e) =>
                        (e.sourceId === hoveredNode && e.targetId === node.id) ||
                        (e.targetId === hoveredNode && e.sourceId === node.id)
                    );
                  const dimmed = hoveredNode && !isHovered && !isConnected;

                  return (
                    <g
                      key={node.id}
                      onMouseDown={(e) => handleMouseDown(node.id, e)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      onDoubleClick={() => router.push(`/notes?page=${node.id}`)}
                      style={{ cursor: "pointer" }}
                      opacity={dimmed ? 0.3 : 1}
                    >
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={isHovered ? 10 : 7}
                        fill={isHovered ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.7)"}
                        stroke="hsl(var(--background))"
                        strokeWidth={2}
                      />
                      <text
                        x={node.x}
                        y={node.y + 20}
                        textAnchor="middle"
                        fontSize={11}
                        fill="hsl(var(--foreground))"
                        fontWeight={isHovered ? 600 : 400}
                      >
                        {node.title.length > 20
                          ? node.title.slice(0, 20) + "..."
                          : node.title}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
