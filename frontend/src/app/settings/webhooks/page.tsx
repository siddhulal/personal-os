"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/layout/app-shell";
import {
  Webhook,
  Plus,
  Trash2,
  TestTube,
  ToggleLeft,
  ToggleRight,
  Globe,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  fetchWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  testWebhook,
} from "@/lib/api/webhooks";
import type { WebhookConfig } from "@/types";

const EVENT_TYPES = [
  "task.created",
  "task.completed",
  "note.created",
  "note.updated",
  "project.created",
  "habit.completed",
  "flashcard.reviewed",
] as const;

const INITIAL_FORM = {
  name: "",
  url: "",
  secret: "",
  events: [] as string[],
  isActive: true,
};

export default function WebhooksPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { data: webhooks = [], isLoading } = useQuery<WebhookConfig[]>({
    queryKey: ["webhooks"],
    queryFn: fetchWebhooks,
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createWebhook>[0]) => createWebhook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      closeDialog();
      toast.success("Webhook created");
    },
    onError: () => toast.error("Failed to create webhook"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateWebhook>[1] }) =>
      updateWebhook(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      closeDialog();
      toast.success("Webhook updated");
    },
    onError: () => toast.error("Failed to update webhook"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      setDeleteConfirmId(null);
      toast.success("Webhook deleted");
    },
    onError: () => toast.error("Failed to delete webhook"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, wh }: { id: string; wh: WebhookConfig }) =>
      updateWebhook(id, {
        name: wh.name,
        url: wh.url,
        events: wh.events,
        isActive: !wh.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook status updated");
    },
    onError: () => toast.error("Failed to toggle webhook"),
  });

  function closeDialog() {
    setDialogOpen(false);
    setEditingWebhook(null);
    setForm(INITIAL_FORM);
  }

  function openCreate() {
    setEditingWebhook(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  }

  function openEdit(wh: WebhookConfig) {
    setEditingWebhook(wh);
    setForm({
      name: wh.name,
      url: wh.url,
      secret: "",
      events: [...wh.events],
      isActive: wh.isActive,
    });
    setDialogOpen(true);
  }

  function toggleEvent(event: string) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.url.trim() || form.events.length === 0) return;
    const data = {
      name: form.name.trim(),
      url: form.url.trim(),
      secret: form.secret.trim() || undefined,
      events: form.events,
      isActive: form.isActive,
    };
    if (editingWebhook) {
      updateMutation.mutate({ id: editingWebhook.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  async function handleTest(id: string) {
    setTestingId(id);
    try {
      const success = await testWebhook(id);
      if (success) {
        toast.success("Webhook test successful");
      } else {
        toast.error("Webhook test failed - endpoint did not respond correctly");
      }
    } catch {
      toast.error("Webhook test failed - could not reach endpoint");
    } finally {
      setTestingId(null);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Webhook className="h-7 w-7" />
              Webhooks
            </h1>
            <p className="text-muted-foreground mt-1">
              Configure webhooks to integrate with external services
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Webhook
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading webhooks...
          </div>
        ) : webhooks.length === 0 ? (
          <Card className="p-12">
            <div className="text-center text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No webhooks configured</p>
              <p className="text-sm mt-1">
                Webhooks send real-time notifications to external services when events occur.
              </p>
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first webhook
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh) => (
              <Card key={wh.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{wh.name}</span>
                      {wh.isActive ? (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                      {wh.failureCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {wh.failureCount} failure{wh.failureCount !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {wh.url}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {wh.events.map((ev) => (
                        <Badge key={ev} variant="outline" className="text-xs">
                          {ev}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last triggered: {formatDate(wh.lastTriggeredAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title={wh.isActive ? "Deactivate" : "Activate"}
                      onClick={() => toggleMutation.mutate({ id: wh.id, wh })}
                      disabled={toggleMutation.isPending}
                    >
                      {wh.isActive ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Test webhook"
                      onClick={() => handleTest(wh.id)}
                      disabled={testingId === wh.id}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openEdit(wh)}>
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      title="Delete webhook"
                      onClick={() => setDeleteConfirmId(wh.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { if (!v) closeDialog(); else setDialogOpen(true); }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingWebhook ? "Edit Webhook" : "Create Webhook"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wh-name">Name</Label>
              <Input
                id="wh-name"
                placeholder="My Webhook"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wh-url">URL</Label>
              <Input
                id="wh-url"
                placeholder="https://example.com/webhook"
                value={form.url}
                onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wh-secret">
                Secret
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Input
                id="wh-secret"
                type="password"
                placeholder={editingWebhook?.hasSecret ? "Leave blank to keep current" : "Signing secret"}
                value={form.secret}
                onChange={(e) => setForm((p) => ({ ...p, secret: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Events</Label>
              <div className="grid grid-cols-2 gap-2">
                {EVENT_TYPES.map((ev) => (
                  <label
                    key={ev}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      form.events.includes(ev)
                        ? "border-primary bg-primary/5"
                        : "hover:bg-accent"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.events.includes(ev)}
                      onChange={() => toggleEvent(ev)}
                      className="rounded border-input"
                    />
                    {ev}
                  </label>
                ))}
              </div>
              {form.events.length === 0 && (
                <p className="text-xs text-destructive">Select at least one event</p>
              )}
            </div>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
              <Label className="cursor-pointer">Active</Label>
              <button
                type="button"
                onClick={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}
                className="transition-colors"
              >
                {form.isActive ? (
                  <ToggleRight className="h-6 w-6 text-green-600" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              disabled={!form.name.trim() || !form.url.trim() || form.events.length === 0 || isPending}
              onClick={handleSubmit}
            >
              {isPending ? "Saving..." : editingWebhook ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(v) => { if (!v) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Webhook</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this webhook? This action cannot be undone.
            Any integrations relying on this webhook will stop receiving events.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
