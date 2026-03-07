"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAiChat } from "@/lib/ai-chat-context";
import { streamChat, fetchConversations, fetchConversation, deleteConversation } from "@/lib/api/ai";
import api from "@/lib/api";
import { AiMessageBubble } from "./AiMessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  X,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  ChevronDown,
  Maximize2,
  Minimize2,
  Square,
  Save,
  FolderKanban,
} from "lucide-react";
import { toast } from "sonner";
import type { AiChatMessage, AiConversation } from "@/types";

const CATEGORIES = ["BEHAVIORAL", "TECHNICAL", "SYSTEM_DESIGN", "CODING", "SITUATIONAL"] as const;
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

export function AiChatSidebar() {
  const { isOpen, isExpanded, closeChat, toggleExpanded, currentContext, canvasSaveHandler } = useAiChat();
  const queryClient = useQueryClient();
  const pathname = usePathname();

  // Show save actions based on current page context
  const showSaveProject = pathname === "/projects";
  const showSaveQuestion = pathname === "/interview";
  const showSaveCanvas = pathname === "/notes/canvas";

  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Save as Question dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveQuestionText, setSaveQuestionText] = useState("");
  const [saveCategory, setSaveCategory] = useState("TECHNICAL");
  const [saveDifficulty, setSaveDifficulty] = useState("MEDIUM");
  const [saveAnswerText, setSaveAnswerText] = useState("");
  const [saving, setSaving] = useState(false);

  // Save as Project dialog state
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] = useState("PLANNING");
  const [savingProject, setSavingProject] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { data: conversations } = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: () => fetchConversations(),
    enabled: isOpen,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const loadConversation = async (id: string) => {
    try {
      const conv = await fetchConversation(id);
      setConversationId(id);
      setMessages(conv.messages || []);
      setShowHistory(false);
    } catch {
      // ignore
    }
  };

  const handleNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setStreamingContent("");
    setShowHistory(false);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteConversation(id);
    queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    if (conversationId === id) {
      handleNewConversation();
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: AiChatMessage = {
      id: `temp-${Date.now()}`,
      role: "USER",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // When on canvas page, always add diagram generation context
    let effectiveContext = currentContext;
    if (showSaveCanvas) {
      const canvasHint = `IMPORTANT: You are assisting on a visual canvas/diagram page. When the user asks about hierarchies, architectures, class structures, frameworks, or any topic that can be visualized, ALWAYS include a Mermaid diagram using \`\`\`mermaid code blocks.

STRICT Mermaid syntax rules — follow EXACTLY:
- Use flowchart TD for hierarchies/relationships
- Node labels: A[Label Text] — square brackets only
- Special chars in labels: A["Label (Text)"] — wrap in quotes
- Subgraph names: subgraph SG_Name["Display Name"] — always use ID + label format
- Edges: --> for solid, -.-> for dotted, -->|label| for labeled
- Do NOT use <|--, <|.., or -- text --> syntax
- Do NOT use semicolons or newlines inside labels
- Keep node IDs short: A1, B2, etc.

Keep text explanations brief — the diagram is the main output. The user can save your Mermaid diagram directly as interactive canvas nodes.`;
      effectiveContext = effectiveContext
        ? `${canvasHint}\n\nAdditional context: ${effectiveContext}`
        : canvasHint;
    }

    abortRef.current = streamChat(
      trimmed,
      conversationId,
      effectiveContext,
      (token) => {
        setStreamingContent((prev) => prev + token);
      },
      (newConversationId) => {
        setConversationId(newConversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "ASSISTANT",
            content: "",
            createdAt: new Date().toISOString(),
          },
        ]);
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            content: "",
          };
          return updated;
        });
        setIsStreaming(false);
        setStreamingContent("");
        queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
        fetchConversation(newConversationId).then((conv) => {
          setMessages(conv.messages || []);
        });
      },
      (error) => {
        setIsStreaming(false);
        setStreamingContent("");
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: "ASSISTANT",
            content: `Error: ${error}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    );
  };

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    if (streamingContent) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "ASSISTANT",
          content: streamingContent,
          createdAt: new Date().toISOString(),
        },
      ]);
    }
    setIsStreaming(false);
    setStreamingContent("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveAsProject = (content: string) => {
    // Try to extract a project name from the first line or bold text
    const lines = content.split("\n").filter((l) => l.trim());
    let name = "";
    for (const line of lines) {
      const boldMatch = line.match(/\*\*Project:\s*(.+?)\*\*/i) || line.match(/\*\*(.+?)\*\*/);
      if (boldMatch) {
        name = boldMatch[1].trim();
        break;
      }
    }
    if (!name && lines.length > 0) {
      name = lines[0].replace(/^#+\s*/, "").replace(/\*\*/g, "").trim().slice(0, 100);
    }
    setProjectName(name);
    setProjectDescription(content);
    setProjectStatus("PLANNING");
    setProjectDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!projectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    setSavingProject(true);
    try {
      await api.post("/api/projects", {
        name: projectName.trim(),
        description: projectDescription.trim(),
        status: projectStatus,
      });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project created successfully");
      setProjectDialogOpen(false);
    } catch {
      toast.error("Failed to create project");
    } finally {
      setSavingProject(false);
    }
  };

  const handleSaveAsQuestion = (content: string) => {
    // Pre-fill: use the full AI response as the answer, leave question blank for user to type
    setSaveQuestionText("");
    setSaveAnswerText(content);
    setSaveCategory("TECHNICAL");
    setSaveDifficulty("MEDIUM");
    setSaveDialogOpen(true);
  };

  const handleSaveQuestion = async () => {
    if (!saveQuestionText.trim()) {
      toast.error("Please enter the question text");
      return;
    }
    setSaving(true);
    try {
      const questionRes = await api.post("/api/interview/questions", {
        questionText: saveQuestionText.trim(),
        category: saveCategory,
        difficulty: saveDifficulty,
      });
      // If answer text is provided, save it too
      if (saveAnswerText.trim()) {
        await api.post(`/api/interview/questions/${questionRes.data.id}/answers`, {
          answerText: saveAnswerText.trim(),
        });
      }
      queryClient.invalidateQueries({ queryKey: ["interview-questions"] });
      toast.success("Question saved to Interview Prep");
      setSaveDialogOpen(false);
    } catch {
      toast.error("Failed to save question");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          "fixed top-0 right-0 h-full bg-background border-l shadow-xl z-30",
          "flex flex-col transition-all duration-300",
          isExpanded ? "w-[640px]" : "w-96",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => setShowHistory(!showHistory)}
            >
              <ChevronDown className={cn("w-3 h-3 mr-1 transition-transform", showHistory && "rotate-180")} />
              History
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleNewConversation} title="New conversation">
              <Plus className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleExpanded} title={isExpanded ? "Collapse" : "Expand"}>
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={closeChat}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* History dropdown */}
        {showHistory && (
          <div className="border-b max-h-48 overflow-y-auto">
            {conversations?.content?.length ? (
              conversations.content.map((conv: AiConversation) => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-accent/50 text-sm",
                    conversationId === conv.id && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:text-destructive flex-shrink-0"
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                No conversations yet
              </div>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm text-center px-4">
              <MessageSquare className="w-10 h-10 mb-3 opacity-30" />
              <p className="font-medium">AI Assistant</p>
              <p className="text-xs mt-1">
                Ask me anything about your tasks, learning topics, interview prep, or notes.
              </p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <AiMessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  onSaveAsProject={msg.role === "ASSISTANT" && showSaveProject ? handleSaveAsProject : undefined}
                  onSaveAsQuestion={msg.role === "ASSISTANT" && showSaveQuestion ? handleSaveAsQuestion : undefined}
                  onSaveAsCanvas={msg.role === "ASSISTANT" && showSaveCanvas && canvasSaveHandler ? canvasSaveHandler : undefined}
                />
              ))}
              {isStreaming && streamingContent && (
                <AiMessageBubble
                  role="ASSISTANT"
                  content={streamingContent}
                  isStreaming
                />
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-3">
          {isStreaming && (
            <div className="flex justify-center mb-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                onClick={handleStop}
              >
                <Square className="w-3 h-3 mr-1.5 fill-current" />
                Stop generating
              </Button>
            </div>
          )}
          <div className="flex gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI anything..."
              className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[38px] max-h-[120px]"
              rows={1}
              disabled={isStreaming}
            />
            <Button
              size="sm"
              className="h-[38px] w-[38px] p-0"
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Save as Question Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Save as Interview Question</DialogTitle>
            <DialogDescription>
              Save this AI response as an interview question with answer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question *</Label>
              <Textarea
                value={saveQuestionText}
                onChange={(e) => setSaveQuestionText(e.target.value)}
                placeholder="Type the interview question here..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={saveCategory} onValueChange={setSaveCategory}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Difficulty</Label>
                <Select value={saveDifficulty} onValueChange={setSaveDifficulty}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((diff) => (
                      <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Answer (from AI response)</Label>
              <Textarea
                value={saveAnswerText}
                onChange={(e) => setSaveAnswerText(e.target.value)}
                placeholder="The AI response will be pre-filled here..."
                rows={6}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestion} disabled={saving || !saveQuestionText.trim()}>
              {saving ? "Saving..." : (
                <>
                  <Save className="w-4 h-4 mr-1.5" />
                  Save Question
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Project Dialog */}
      <Dialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Save as Project</DialogTitle>
            <DialogDescription>
              Create a new project from this AI response. Edit the name and description as needed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Project Name *</Label>
              <Input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Enter project name..."
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={projectStatus} onValueChange={setProjectStatus}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNING">Planning</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description (from AI response)</Label>
              <Textarea
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                rows={10}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProject} disabled={savingProject || !projectName.trim()}>
              {savingProject ? "Creating..." : (
                <>
                  <FolderKanban className="w-4 h-4 mr-1.5" />
                  Create Project
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
