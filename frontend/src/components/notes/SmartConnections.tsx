"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchConnectionsForEntity,
  createConnection,
  deleteConnection,
} from "@/lib/api/connections";
import type { CrossModuleLink } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Link2,
  FileText,
  CheckSquare,
  FolderKanban,
  Target,
  Lightbulb,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface SmartConnectionsProps {
  entityType: string;
  entityId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ENTITY_TYPES = [
  { value: "note", label: "Note", icon: FileText },
  { value: "task", label: "Task", icon: CheckSquare },
  { value: "project", label: "Project", icon: FolderKanban },
  { value: "goal", label: "Goal", icon: Target },
  { value: "idea", label: "Idea", icon: Lightbulb },
] as const;

const LINK_TYPES = [
  "RELATED",
  "DEPENDS_ON",
  "BLOCKS",
  "PARENT",
  "CHILD",
  "REFERENCES",
] as const;

function getEntityIcon(type: string) {
  switch (type.toLowerCase()) {
    case "note":
      return FileText;
    case "task":
      return CheckSquare;
    case "project":
      return FolderKanban;
    case "goal":
      return Target;
    case "idea":
      return Lightbulb;
    default:
      return Link2;
  }
}

function getLinkColor(linkType: string) {
  switch (linkType) {
    case "RELATED":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "DEPENDS_ON":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "BLOCKS":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    case "PARENT":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    case "CHILD":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "REFERENCES":
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function SmartConnections({
  entityType,
  entityId,
  open,
  onOpenChange,
}: SmartConnectionsProps) {
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [targetType, setTargetType] = useState<string>("");
  const [targetId, setTargetId] = useState("");
  const [linkType, setLinkType] = useState<string>("RELATED");

  const { data: connections = [], isLoading } = useQuery<CrossModuleLink[]>({
    queryKey: ["connections", entityType, entityId],
    queryFn: () => fetchConnectionsForEntity(entityType, entityId),
    enabled: open && !!entityId,
  });

  const createMutation = useMutation({
    mutationFn: (data: {
      sourceType: string;
      sourceId: string;
      targetType: string;
      targetId: string;
      linkType: string;
    }) => createConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["connections", entityType, entityId],
      });
      toast.success("Connection created");
      resetForm();
    },
    onError: () => {
      toast.error("Failed to create connection");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConnection(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["connections", entityType, entityId],
      });
      toast.success("Connection removed");
    },
    onError: () => {
      toast.error("Failed to remove connection");
    },
  });

  const groupedConnections = useMemo(() => {
    const groups: Record<string, CrossModuleLink[]> = {};
    connections.forEach((conn) => {
      const isSource =
        conn.sourceType === entityType && conn.sourceId === entityId;
      const otherType = isSource ? conn.targetType : conn.sourceType;
      const key = otherType.toLowerCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(conn);
    });
    return groups;
  }, [connections, entityType, entityId]);

  function resetForm() {
    setTargetType("");
    setTargetId("");
    setLinkType("RELATED");
    setShowAddForm(false);
  }

  function handleCreate() {
    if (!targetType || !targetId.trim()) {
      toast.error("Please select a target type and enter a target ID");
      return;
    }
    createMutation.mutate({
      sourceType: entityType,
      sourceId: entityId,
      targetType: targetType,
      targetId: targetId.trim(),
      linkType: linkType,
    });
  }

  function getConnectionDisplay(conn: CrossModuleLink) {
    const isSource =
      conn.sourceType === entityType && conn.sourceId === entityId;
    const otherType = isSource ? conn.targetType : conn.sourceType;
    const otherTitle = isSource
      ? conn.targetTitle || conn.targetId
      : conn.sourceTitle || conn.sourceId;
    return { otherType, otherTitle };
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Smart Connections
          </DialogTitle>
        </DialogHeader>

        {/* Connections list */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Loading connections...
            </div>
          ) : connections.length === 0 ? (
            <div className="py-8 text-center">
              <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No connections yet. Add one to link this {entityType} to other
                items.
              </p>
            </div>
          ) : (
            Object.entries(groupedConnections).map(([type, conns]) => {
              const TypeIcon = getEntityIcon(type);
              return (
                <div key={type}>
                  <div className="flex items-center gap-2 mb-2">
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {type}s
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {conns.length}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {conns.map((conn) => {
                      const { otherType, otherTitle } = getConnectionDisplay(conn);
                      const Icon = getEntityIcon(otherType);

                      return (
                        <div
                          key={conn.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{otherTitle}</span>
                            <Badge
                              className={`text-[10px] px-1.5 py-0 shrink-0 ${getLinkColor(
                                conn.linkType
                              )}`}
                            >
                              {conn.linkType.replace("_", " ")}
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0"
                            onClick={() => deleteMutation.mutate(conn.id)}
                            disabled={deleteMutation.isPending}
                            title="Remove connection"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <Separator className="mt-3" />
                </div>
              );
            })
          )}
        </div>

        {/* Add Connection */}
        <div className="pt-2">
          {!showAddForm ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="h-4 w-4" />
              Add Connection
            </Button>
          ) : (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/30">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">New Connection</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={resetForm}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Target Type
                  </label>
                  <Select value={targetType} onValueChange={setTargetType}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((et) => (
                        <SelectItem key={et.value} value={et.value}>
                          {et.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">
                    Link Type
                  </label>
                  <Select value={linkType} onValueChange={setLinkType}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LINK_TYPES.map((lt) => (
                        <SelectItem key={lt} value={lt}>
                          {lt.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  Target ID
                </label>
                <Input
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Enter the target entity ID"
                  className="h-9"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={
                    !targetType || !targetId.trim() || createMutation.isPending
                  }
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
