"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function QuickAdd() {
  const [value, setValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const trimmed = value.trim();
      let type = "task";
      let content = trimmed;

      if (trimmed.startsWith("t: ") || trimmed.startsWith("t:")) {
        type = "task";
        content = trimmed.replace(/^t:\s*/, "");
      } else if (trimmed.startsWith("n: ") || trimmed.startsWith("n:")) {
        type = "note";
        content = trimmed.replace(/^n:\s*/, "");
      } else if (trimmed.startsWith("i: ") || trimmed.startsWith("i:")) {
        type = "idea";
        content = trimmed.replace(/^i:\s*/, "");
      }

      if (type === "task") {
        await api.post("/api/tasks", { title: content });
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        toast.success("Task created");
      } else if (type === "note") {
        await api.post("/api/notes", { title: content });
        queryClient.invalidateQueries({ queryKey: ["notes"] });
        toast.success("Note created");
      } else if (type === "idea") {
        await api.post("/api/ideas", { title: content });
        queryClient.invalidateQueries({ queryKey: ["ideas"] });
        toast.success("Idea created");
      }

      setValue("");
    } catch {
      toast.error("Failed to create item");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Quick add: t: task, n: note, i: idea"
        className="pl-10 h-12 text-base bg-card shadow-sm"
        disabled={isSubmitting}
      />
    </form>
  );
}
