"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
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
  addEdge,
} from "reactflow";
import "reactflow/dist/style.css";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Maximize, MoreVertical, Check, X, MoveRight, Type } from "lucide-react";
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
import { cn } from "@/lib/utils";

const NODE_WIDTH = 260;
const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6",
];
const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

// Custom Node Component
const NoteNode = ({ data, id, selected }: NodeProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || "");
  const [content, setContent] = useState(data.content || "");
  
  const onSave = () => {
    data.onUpdate(id, { label, content });
    setIsEditing(false);
  };

  const onCancel = () => {
    setLabel(data.label || "");
    setContent(data.content || "");
    setIsEditing(false);
  };

  return (
    <div 
      className={cn(
        "bg-card border rounded-xl shadow-md min-w-[240px] transition-shadow relative",
        selected ? "ring-2 ring-primary shadow-lg" : "hover:shadow-lg"
      )}
      onDoubleClick={() => !isEditing && setIsEditing(true)}
    >
      {/* Port Handles - Enhanced hit area and clear feedback */}
      <Handle type="source" position={Position.Top} id="top" className="!w-4 !h-4 !bg-primary border-2 border-background !-top-2 hover:!scale-150 hover:!bg-primary/80 transition-all cursor-crosshair z-50" />
      <Handle type="source" position={Position.Left} id="left" className="!w-4 !h-4 !bg-primary border-2 border-background !-left-2 hover:!scale-150 hover:!bg-primary/80 transition-all cursor-crosshair z-50" />
      <Handle type="source" position={Position.Right} id="right" className="!w-4 !h-4 !bg-primary border-2 border-background !-right-2 hover:!scale-150 hover:!bg-primary/80 transition-all cursor-crosshair z-50" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!w-4 !h-4 !bg-primary border-2 border-background !-bottom-2 hover:!scale-150 hover:!bg-primary/80 transition-all cursor-crosshair z-50" />

      <div className="px-3 py-1.5 flex items-center justify-between gap-2 rounded-t-xl" style={{ backgroundColor: data.color || "#6366f1" }}>
        {isEditing ? (
          <input
            autoFocus
            className="flex-1 text-sm font-semibold text-white bg-white/20 rounded px-1.5 py-0.5 outline-none border-none"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave()}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm font-semibold text-white truncate">{data.label || "Untitled"}</span>
        )}
        <div className="flex gap-1">
          {isEditing ? (
            <>
              <button onClick={onSave} className="text-white hover:bg-white/20 p-0.5 rounded"><Check className="h-3.5 w-3.5" /></button>
              <button onClick={onCancel} className="text-white hover:bg-white/20 p-0.5 rounded"><X className="h-3.5 w-3.5" /></button>
            </>
          ) : (
            <MoreVertical className="h-3.5 w-3.5 text-white/50" />
          )}
        </div>
      </div>

      <div className="p-3">
        {isEditing ? (
          <textarea
            className="w-full text-sm bg-muted/40 border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary resize-none h-24"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap min-h-[40px]">
            {data.content || <span className="italic opacity-40 text-xs">Double-click to edit</span>}
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = { note: NoteNode };

function CanvasEngine() {
  const queryClient = useQueryClient();
  const { screenToFlowPosition, fitView, getViewport } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [selectedEdgeType, setSelectedEdgeType] = useState<"solid" | "dotted">("solid");
  const edgeTypeRef = useRef<"solid" | "dotted">("solid");
  
  useEffect(() => {
    edgeTypeRef.current = selectedEdgeType;
  }, [selectedEdgeType]);

  const isInitialLoadRef = useRef(true);

  const { data: apiNodes } = useQuery({ 
    queryKey: ["canvas-nodes"], 
    queryFn: () => fetchCanvasNodes("default") 
  });
  const { data: apiEdges } = useQuery({ 
    queryKey: ["canvas-edges"], 
    queryFn: () => fetchCanvasEdges("default") 
  });

  const updateNodeMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CanvasNode> }) => updateCanvasNode(id, data as any),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["canvas-nodes"] }),
  });

  const createNodeMut = useMutation({
    mutationFn: createCanvasNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canvas-nodes"] });
      toast.success("Card added");
    },
    onError: (err: any) => {
      console.error("Create node error:", err);
      toast.error("Failed to create card. Please try again.");
    },
  });

  const deleteNodeMut = useMutation({
    mutationFn: deleteCanvasNode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["canvas-nodes"] });
      queryClient.invalidateQueries({ queryKey: ["canvas-edges"] });
    },
  });

  const createEdgeMut = useMutation({
    mutationFn: createCanvasEdge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["canvas-edges"] }),
  });

  const deleteEdgeMut = useMutation({
    mutationFn: deleteCanvasEdge,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["canvas-edges"] }),
  });

  const onUpdateNode = useCallback((id: string, updates: any) => {
    updateNodeMut.mutate({ id, data: updates });
  }, [updateNodeMut]);

  // Sync API Nodes -> State
  useEffect(() => {
    if (apiNodes) {
      const rfNodes: Node[] = apiNodes.map((n) => ({
        id: n.id,
        type: "note",
        position: { x: n.x, y: n.y },
        data: { 
          label: n.label, 
          content: n.content, 
          color: n.color,
          onUpdate: onUpdateNode
        },
      }));
      
      if (isInitialLoadRef.current || rfNodes.length !== nodes.length) {
        setNodes(rfNodes);
        isInitialLoadRef.current = false;
        
        if (!hasInitialized && rfNodes.length > 0) {
          setTimeout(() => {
            fitView({ padding: 0.2, duration: 800 });
            setHasInitialized(true);
          }, 100);
        }
      }
    }
  }, [apiNodes, onUpdateNode, fitView, hasInitialized, nodes.length, setNodes]);

  // Sync API Edges -> State
  useEffect(() => {
    if (apiEdges) {
      const rfEdges: Edge[] = apiEdges.map((e) => ({
        id: e.id,
        source: e.sourceNodeId,
        target: e.targetNodeId,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        animated: false, // Start static, only animated if we add a toggle
        style: { 
          stroke: "hsl(var(--primary))", 
          strokeWidth: 2, 
          opacity: 0.6,
          strokeDasharray: e.edgeType === "dotted" ? "5,5" : undefined
        },
      }));
      
      if (rfEdges.length !== edges.length) {
        setEdges(rfEdges);
      }
    }
  }, [apiEdges, edges.length, setEdges]);

  const onConnect: OnConnect = useCallback((params) => {
    if (params.source && params.target) {
      createEdgeMut.mutate({ 
        canvasId: "default", 
        sourceNodeId: params.source, 
        targetNodeId: params.target,
        sourceHandle: params.sourceHandle || undefined,
        targetHandle: params.targetHandle || undefined,
        edgeType: edgeTypeRef.current
      });
    }
  }, [createEdgeMut]);

  const onNodesDelete = useCallback((deleted: Node[]) => {
    deleted.forEach(node => deleteNodeMut.mutate(node.id));
  }, [deleteNodeMut]);

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    deleted.forEach(edge => deleteEdgeMut.mutate(edge.id));
  }, [deleteEdgeMut]);

  const onNodeDragStop = useCallback((_: any, node: Node) => {
    updateNodeMut.mutate({ 
      id: node.id, 
      data: { x: Math.round(node.position.x), y: Math.round(node.position.y) } 
    });
  }, [updateNodeMut]);

  const onAddCard = useCallback(() => {
    try {
      const { x, y, zoom } = getViewport();
      
      // Calculate center of the visible area
      const centerX = -x / zoom + (window.innerWidth / 2) / zoom;
      const centerY = -y / zoom + (window.innerHeight / 2) / zoom;

      createNodeMut.mutate({ 
        canvasId: "default", 
        label: "New Card", 
        content: "", 
        x: Math.round(centerX - NODE_WIDTH / 2), 
        y: Math.round(centerY - 50), 
        width: NODE_WIDTH, 
        height: 100, 
        color: pickColor(), 
        nodeType: "note" 
      });
    } catch (error) {
      // Fallback
      createNodeMut.mutate({ 
        canvasId: "default", 
        label: "New Card", 
        content: "", 
        x: Math.round(Math.random() * 400), 
        y: Math.round(Math.random() * 400), 
        width: NODE_WIDTH, 
        height: 100, 
        color: pickColor(), 
        nodeType: "note" 
      });
    }
  }, [createNodeMut, getViewport]);

  const onDeleteSelected = () => {
    const selectedNodes = nodes.filter(n => n.selected);
    const selectedEdges = edges.filter(e => e.selected);
    
    onNodesDelete(selectedNodes);
    onEdgesDelete(selectedEdges);
    
    // Optimistically remove from local state
    setNodes(nds => nds.filter(n => !n.selected));
    setEdges(eds => eds.filter(e => !e.selected));
  };

  const onEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    deleteEdgeMut.mutate(edge.id);
    setEdges(eds => eds.filter(e => e.id !== edge.id));
  }, [deleteEdgeMut, setEdges]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodesDelete={onNodesDelete}
      onEdgesDelete={onEdgesDelete}
      onEdgeDoubleClick={onEdgeDoubleClick}
      onNodeDragStop={onNodeDragStop}
      nodeTypes={nodeTypes}
      connectionMode={ConnectionMode.Loose}
      snapToGrid
      snapGrid={[15, 15]}
      proOptions={{ hideAttribution: true }}
      deleteKeyCode={["Backspace", "Delete"]}
      multiSelectionKeyCode={["Meta", "Control"]}
      selectionKeyCode={["Shift"]}
    >
      <Background gap={20} size={1} color="hsl(var(--border))" />
      <Controls />
      <Panel position="top-right" className="flex items-center gap-2 bg-background/80 backdrop-blur p-1 rounded-lg border shadow-sm">
        <div className="flex bg-muted/50 rounded-md p-0.5 mr-1">
          <Button 
            variant={selectedEdgeType === "solid" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-7 px-2 text-[10px]" 
            onClick={() => setSelectedEdgeType("solid")}
          >
            Solid
          </Button>
          <Button 
            variant={selectedEdgeType === "dotted" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-7 px-2 text-[10px]" 
            onClick={() => setSelectedEdgeType("dotted")}
          >
            Dotted
          </Button>
        </div>
        <div className="w-px h-4 bg-border mx-1" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onAddCard} 
          className="h-8 text-xs font-medium"
          disabled={createNodeMut.isPending}
        >
          {createNodeMut.isPending ? (
            <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent animate-spin mr-1" />
          ) : (
            <Plus className="h-3.5 w-3.5 mr-1" />
          )}
          Add Card
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fitView({ duration: 800 })} className="h-8 text-xs font-medium">
          <Maximize className="h-3.5 w-3.5 mr-1" /> Fit View
        </Button>
        <div className="w-px h-4 bg-border self-center mx-1" />
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDeleteSelected} 
          className="h-8 text-xs font-medium text-destructive hover:text-destructive hover:bg-destructive/10" 
          disabled={!nodes.some(n => n.selected) && !edges.some(e => e.selected)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
        </Button>
      </Panel>
      <Panel position="top-left" className="bg-background/80 backdrop-blur px-3 py-1.5 rounded-lg border shadow-sm">
        <h1 className="text-sm font-bold tracking-tight">Personal Canvas</h1>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">
          {nodes.length} cards • {edges.length} links
        </p>
      </Panel>
    </ReactFlow>
  );
}

export default function CanvasContent() {
  return (
    <ReactFlowProvider>
      <CanvasEngine />
    </ReactFlowProvider>
  );
}
