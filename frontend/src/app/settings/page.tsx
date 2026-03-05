"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Palette, Info, LogOut, Sun, Moon, Monitor, Sparkles, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { fetchAiSettings, updateAiSettings, fetchProviderStatus, fetchOllamaModels } from "@/lib/api/ai";
import type { AiSettings, AiProviderType } from "@/types";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();

  // AI Settings state
  const [activeProvider, setActiveProvider] = useState<AiProviderType>("OLLAMA");
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.1");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-flash");

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: aiSettings } = useQuery<AiSettings>({
    queryKey: ["ai-settings"],
    queryFn: fetchAiSettings,
  });

  const { data: providerStatus } = useQuery<Record<string, boolean>>({
    queryKey: ["ai-provider-status"],
    queryFn: fetchProviderStatus,
  });

  const { data: ollamaModels, refetch: refetchModels, isFetching: isLoadingModels } = useQuery<string[]>({
    queryKey: ["ollama-models"],
    queryFn: fetchOllamaModels,
  });

  // Sync AI settings to local state when loaded
  useEffect(() => {
    if (aiSettings) {
      setActiveProvider(aiSettings.activeProvider);
      setOllamaBaseUrl(aiSettings.ollamaBaseUrl || "http://localhost:11434");
      setOllamaModel(aiSettings.ollamaModel || "llama3.1");
      setOpenaiModel(aiSettings.openaiModel || "gpt-4o");
      setGeminiModel(aiSettings.geminiModel || "gemini-1.5-flash");
    }
  }, [aiSettings]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateAiSettings>[0]) => updateAiSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.success("AI settings saved");
    },
    onError: () => {
      toast.error("Failed to save AI settings");
    },
  });

  function handleSaveAiSettings() {
    updateSettingsMutation.mutate({
      activeProvider,
      ollamaBaseUrl,
      ollamaModel,
      openaiApiKey: openaiApiKey || undefined,
      openaiModel,
      geminiApiKey: geminiApiKey || undefined,
      geminiModel,
    });
  }

  function StatusDot({ provider }: { provider: string }) {
    const isAvailable = providerStatus?.[provider];
    return (
      <span
        className={`inline-block w-2 h-2 rounded-full ${
          isAvailable ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
        }`}
        title={isAvailable ? "Available" : "Not configured"}
      />
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your account and application preferences
          </p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          {/* User Profile */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Profile</CardTitle>
              </div>
              <CardDescription>
                Your personal account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold">
                  {user?.firstName?.charAt(0) ?? ""}
                  {user?.lastName?.charAt(0) ?? ""}
                </div>
                <div>
                  <p className="text-lg font-semibold">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name</Label>
                    <Input
                      id="first-name"
                      value={user?.firstName ?? ""}
                      disabled
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name</Label>
                    <Input
                      id="last-name"
                      value={user?.lastName ?? ""}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email ?? ""}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">AI Configuration</CardTitle>
              </div>
              <CardDescription>
                Configure your AI providers for the Life OS brain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Provider Selector */}
              <div className="space-y-2">
                <Label>Active Provider</Label>
                <Select value={activeProvider} onValueChange={(v) => setActiveProvider(v as AiProviderType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OLLAMA">
                      <span className="flex items-center gap-2">
                        <StatusDot provider="OLLAMA" /> Ollama (Local)
                      </span>
                    </SelectItem>
                    <SelectItem value="OPENAI">
                      <span className="flex items-center gap-2">
                        <StatusDot provider="OPENAI" /> OpenAI
                      </span>
                    </SelectItem>
                    <SelectItem value="GEMINI">
                      <span className="flex items-center gap-2">
                        <StatusDot provider="GEMINI" /> Google Gemini
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Ollama Settings */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <StatusDot provider="OLLAMA" /> Ollama (Local)
                </h4>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ollama-url">Base URL</Label>
                    <Input
                      id="ollama-url"
                      value={ollamaBaseUrl}
                      onChange={(e) => setOllamaBaseUrl(e.target.value)}
                      placeholder="http://localhost:11434"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ollama-model">Model</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => refetchModels()}
                        disabled={isLoadingModels}
                      >
                        <RefreshCw className={`h-3 w-3 mr-1 ${isLoadingModels ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>
                    {ollamaModels && ollamaModels.length > 0 ? (
                      <Select value={ollamaModel} onValueChange={setOllamaModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent>
                          {ollamaModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="ollama-model"
                        value={ollamaModel}
                        onChange={(e) => setOllamaModel(e.target.value)}
                        placeholder="qwen3:14b"
                      />
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* OpenAI Settings */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <StatusDot provider="OPENAI" /> OpenAI
                  {aiSettings?.openaiKeySet && (
                    <span className="text-xs text-green-600 dark:text-green-400">(Key set)</span>
                  )}
                </h4>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="openai-key">API Key</Label>
                    <Input
                      id="openai-key"
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder={aiSettings?.openaiKeySet ? "••••••••••••" : "sk-..."}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openai-model">Model</Label>
                    <Input
                      id="openai-model"
                      value={openaiModel}
                      onChange={(e) => setOpenaiModel(e.target.value)}
                      placeholder="gpt-4o"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Gemini Settings */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <StatusDot provider="GEMINI" /> Google Gemini
                  {aiSettings?.geminiKeySet && (
                    <span className="text-xs text-green-600 dark:text-green-400">(Key set)</span>
                  )}
                </h4>
                <div className="grid gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="gemini-key">API Key</Label>
                    <Input
                      id="gemini-key"
                      type="password"
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                      placeholder={aiSettings?.geminiKeySet ? "••••••••••••" : "AIza..."}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gemini-model">Model</Label>
                    <Input
                      id="gemini-model"
                      value={geminiModel}
                      onChange={(e) => setGeminiModel(e.target.value)}
                      placeholder="gemini-1.5-flash"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveAiSettings} disabled={updateSettingsMutation.isPending} className="w-full">
                {updateSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save AI Settings"
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Theme Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">Appearance</CardTitle>
              </div>
              <CardDescription>
                Customize how the application looks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Choose your preferred theme
                </p>
                {mounted && (
                  <div className="flex gap-2">
                    <Button
                      variant={theme === "light" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("light")}
                      className="flex-1"
                    >
                      <Sun className="h-4 w-4 mr-2" />
                      Light
                    </Button>
                    <Button
                      variant={theme === "dark" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("dark")}
                      className="flex-1"
                    >
                      <Moon className="h-4 w-4 mr-2" />
                      Dark
                    </Button>
                    <Button
                      variant={theme === "system" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTheme("system")}
                      className="flex-1"
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      System
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* About Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-lg">About</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Application
                </span>
                <span className="text-sm font-medium">Personal Life OS</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Version</span>
                <span className="text-sm font-medium">1.0.0</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Description
                </span>
                <span className="text-sm font-medium text-right max-w-[250px]">
                  Your all-in-one personal productivity and life management platform
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LogOut className="h-5 w-5 text-destructive" />
                <CardTitle className="text-lg text-destructive">
                  Account Actions
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-md border border-destructive/30 p-4">
                <div>
                  <p className="font-medium text-sm">Sign Out</p>
                  <p className="text-xs text-muted-foreground">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button variant="destructive" size="sm" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
