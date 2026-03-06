"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileText, Plus, Trash2, Layout, BookOpen, Calendar, Briefcase, GraduationCap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchTemplates, createTemplate, updateTemplate, deleteTemplate } from "@/lib/api/templates";
import type { NoteTemplate } from "@/types";

interface NoteTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: NoteTemplate) => void;
}

const CATEGORIES = ["General", "Meeting Notes", "Daily Journal", "Project Brief", "Study Notes"] as const;

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  General: <Layout className="h-5 w-5" />,
  "Meeting Notes": <BookOpen className="h-5 w-5" />,
  "Daily Journal": <Calendar className="h-5 w-5" />,
  "Project Brief": <Briefcase className="h-5 w-5" />,
  "Study Notes": <GraduationCap className="h-5 w-5" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  General: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  "Meeting Notes": "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  "Daily Journal": "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  "Project Brief": "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  "Study Notes": "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
};

export function NoteTemplates({ open, onOpenChange, onSelectTemplate }: NoteTemplatesProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("browse");
  const [editingTemplate, setEditingTemplate] = useState<NoteTemplate | null>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES[0]);

  const { data: templates = [] } = useQuery<NoteTemplate[]>({
    queryKey: ["note-templates"],
    queryFn: fetchTemplates,
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createTemplate>[0]) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-templates"] });
      resetForm();
      toast.success("Template created");
    },
    onError: () => toast.error("Failed to create template"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof updateTemplate>[1] }) =>
      updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-templates"] });
      setEditingTemplate(null);
      resetForm();
      toast.success("Template updated");
    },
    onError: () => toast.error("Failed to update template"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["note-templates"] });
      toast.success("Template deleted");
    },
    onError: () => toast.error("Failed to delete template"),
  });

  function resetForm() {
    setFormName("");
    setFormDescription("");
    setFormContent("");
    setFormCategory(CATEGORIES[0]);
  }

  function handleEdit(tpl: NoteTemplate) {
    setEditingTemplate(tpl);
    setFormName(tpl.name);
    setFormDescription(tpl.description ?? "");
    setFormContent(tpl.content ?? "");
    setFormCategory(tpl.category || CATEGORIES[0]);
    setActiveTab("manage");
  }

  function handleSubmit() {
    if (!formName.trim()) return;
    const data = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      content: formContent.trim() || undefined,
      category: formCategory,
    };
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    } else {
      createMutation.mutate(data);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Note Templates
          </DialogTitle>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="flex-1 overflow-y-auto mt-4">
            {templates.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No templates yet.</p>
                <Button variant="link" size="sm" onClick={() => setActiveTab("manage")}>
                  Create your first template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => { onSelectTemplate(tpl); onOpenChange(false); }}
                    className="text-left rounded-lg border p-4 hover:border-primary hover:bg-accent/50 transition-colors space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-muted-foreground mt-0.5">
                        {CATEGORY_ICONS[tpl.category] ?? <FileText className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{tpl.name}</p>
                        {tpl.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{tpl.description}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className={`text-xs ${CATEGORY_COLORS[tpl.category] ?? ""}`}>
                      {tpl.category}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="manage" className="flex-1 overflow-y-auto mt-4 space-y-5">
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="text-sm font-medium">{editingTemplate ? "Edit Template" : "Create Template"}</h3>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name">Name</Label>
                <Input id="tpl-name" placeholder="Template name" value={formName} onChange={(e) => setFormName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-desc">Description</Label>
                <Input id="tpl-desc" placeholder="Short description" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-content">Content</Label>
                <textarea
                  id="tpl-content"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Template content..."
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <Button key={cat} type="button" variant={formCategory === cat ? "default" : "outline"} size="sm" onClick={() => setFormCategory(cat)}>
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                {editingTemplate && (
                  <Button variant="ghost" size="sm" onClick={() => { setEditingTemplate(null); resetForm(); }}>Cancel</Button>
                )}
                <Button size="sm" disabled={!formName.trim() || isPending} onClick={handleSubmit}>
                  <Plus className="h-4 w-4 mr-1" />
                  {editingTemplate ? "Update" : "Create"}
                </Button>
              </div>
            </div>

            {templates.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Existing Templates</h3>
                {templates.map((tpl) => (
                  <div key={tpl.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground shrink-0">
                        {CATEGORY_ICONS[tpl.category] ?? <FileText className="h-4 w-4" />}
                      </span>
                      <span className="text-sm font-medium truncate">{tpl.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">{tpl.category}</Badge>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(tpl)}>Edit</Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(tpl.id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
