"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  fetchAiSettings,
  updateAiSettings,
  fetchOllamaModels,
  fetchOpenAiModels,
  fetchGeminiModels,
} from "@/lib/api/ai";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Settings,
  Cpu,
  Moon,
  Sun,
  Monitor,
  LogOut,
  RefreshCw,
  Key,
} from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [openaiModels, setOpenAiModels] = useState<string[]>([]);
  const [geminiModels, setGeminiModels] = useState<string[]>([]);
  
  const [fetchingOllama, setFetchingOllama] = useState(false);
  const [fetchingOpenAi, setFetchingOpenAi] = useState(false);
  const [fetchingGemini, setFetchingGemini] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["ai-settings"],
    queryFn: fetchAiSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: updateAiSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-settings"] });
      toast.success("Settings saved successfully");
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const [formData, setFormData] = useState({
    activeProvider: "OLLAMA",
    ollamaBaseUrl: "http://localhost:11434",
    ollamaModel: "",
    openaiApiKey: "",
    openaiModel: "",
    geminiApiKey: "",
    geminiModel: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        activeProvider: settings.activeProvider,
        ollamaBaseUrl: settings.ollamaBaseUrl || "http://localhost:11434",
        ollamaModel: settings.ollamaModel || "",
        openaiApiKey: settings.openaiApiKey || "",
        openaiModel: settings.openaiModel || "",
        geminiApiKey: settings.geminiApiKey || "",
        geminiModel: settings.geminiModel || "",
      });
    }
  }, [settings]);

  const handleRefreshOllama = async () => {
    setFetchingOllama(true);
    try {
      const models = await fetchOllamaModels();
      setOllamaModels(models);
      if (models.length > 0 && !formData.ollamaModel) {
        setFormData(prev => ({ ...prev, ollamaModel: models[0] }));
      }
      toast.success(`Found ${models.length} Ollama models`);
    } catch (error) {
      toast.error("Could not reach Ollama. Check your Base URL.");
    } finally {
      setFetchingOllama(false);
    }
  };

  const handleRefreshOpenAi = async () => {
    if (!formData.openaiApiKey) {
      toast.error("Enter an API Key first");
      return;
    }
    setFetchingOpenAi(true);
    try {
      const models = await fetchOpenAiModels();
      setOpenAiModels(models);
      if (models.length > 0 && !formData.openaiModel) {
        setFormData(prev => ({ ...prev, openaiModel: models[0] }));
      }
      toast.success(`Fetched ${models.length} OpenAI models`);
    } catch (error) {
      toast.error("Failed to fetch OpenAI models. Check your API key.");
    } finally {
      setFetchingOpenAi(false);
    }
  };

  const handleRefreshGemini = async () => {
    if (!formData.geminiApiKey) {
      toast.error("Enter an API Key first");
      return;
    }
    setFetchingGemini(true);
    try {
      const models = await fetchGeminiModels();
      setGeminiModels(models);
      if (models.length > 0 && !formData.geminiModel) {
        setFormData(prev => ({ ...prev, geminiModel: models[0] }));
      }
      toast.success(`Fetched ${models.length} Gemini models`);
    } catch (error) {
      toast.error("Failed to fetch Gemini models. Check your API key.");
    } finally {
      setFetchingGemini(false);
    }
  };

  const handleSave = () => {
    updateSettingsMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto space-y-8 p-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and AI configurations.
          </p>
        </div>

        <div className="grid gap-8">
          {/* Appearance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Appearance
              </CardTitle>
              <CardDescription>
                Customize how Life OS looks on your device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">
                    Select your preferred color theme.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("light")}
                  >
                    <Sun className="h-4 w-4 mr-2" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("dark")}
                  >
                    <Moon className="h-4 w-4 mr-2" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTheme("system")}
                  >
                    <Monitor className="h-4 w-4 mr-2" />
                    System
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Cpu className="h-5 w-5 mr-2" />
                AI Configuration
              </CardTitle>
              <CardDescription>
                Configure your AI providers for the Life OS brain.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="activeProvider">Active Provider</Label>
                <Select
                  value={formData.activeProvider}
                  onValueChange={(v) =>
                    setFormData({ ...formData, activeProvider: v })
                  }
                >
                  <SelectTrigger id="activeProvider">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OLLAMA">Ollama (Local)</SelectItem>
                    <SelectItem value="OPENAI">OpenAI</SelectItem>
                    <SelectItem value="GEMINI">Google Gemini</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Ollama Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Ollama (Local)</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ollamaBaseUrl">Base URL</Label>
                    <Input
                      id="ollamaBaseUrl"
                      value={formData.ollamaBaseUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, ollamaBaseUrl: e.target.value })
                      }
                      placeholder="http://localhost:11434"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ollamaModel">Model</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.ollamaModel}
                        onValueChange={(v) =>
                          setFormData({ ...formData, ollamaModel: v })
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={formData.ollamaModel || "Select model"} />
                        </SelectTrigger>
                        <SelectContent>
                          {ollamaModels.length > 0 ? (
                            ollamaModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)
                          ) : (
                            <SelectItem value={formData.ollamaModel || "none"} disabled>
                              {formData.ollamaModel || "No models found"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={handleRefreshOllama} disabled={fetchingOllama}>
                        <RefreshCw className={`h-4 w-4 ${fetchingOllama ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* OpenAI Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm">OpenAI</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="openaiApiKey">API Key</Label>
                    <Input
                      id="openaiApiKey"
                      type="password"
                      value={formData.openaiApiKey}
                      onChange={(e) =>
                        setFormData({ ...formData, openaiApiKey: e.target.value })
                      }
                      placeholder="sk-..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="openaiModel">Model</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.openaiModel}
                        onValueChange={(v) =>
                          setFormData({ ...formData, openaiModel: v })
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={formData.openaiModel || "Select model"} />
                        </SelectTrigger>
                        <SelectContent>
                          {openaiModels.length > 0 ? (
                            openaiModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)
                          ) : (
                            <SelectItem value={formData.openaiModel || "none"} disabled>
                              {formData.openaiModel || "Click refresh to pull"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={handleRefreshOpenAi} disabled={fetchingOpenAi}>
                        <RefreshCw className={`h-4 w-4 ${fetchingOpenAi ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Gemini Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm">Google Gemini</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="geminiApiKey">API Key</Label>
                    <Input
                      id="geminiApiKey"
                      type="password"
                      value={formData.geminiApiKey}
                      onChange={(e) =>
                        setFormData({ ...formData, geminiApiKey: e.target.value })
                      }
                      placeholder="Enter Gemini API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="geminiModel">Model</Label>
                    <div className="flex gap-2">
                      <Select
                        value={formData.geminiModel}
                        onValueChange={(v) =>
                          setFormData({ ...formData, geminiModel: v })
                        }
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={formData.geminiModel || "Select model"} />
                        </SelectTrigger>
                        <SelectContent>
                          {geminiModels.length > 0 ? (
                            geminiModels.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)
                          ) : (
                            <SelectItem value={formData.geminiModel || "none"} disabled>
                              {formData.geminiModel || "Click refresh to pull"}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={handleRefreshGemini} disabled={fetchingGemini}>
                        <RefreshCw className={`h-4 w-4 ${fetchingGemini ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  className="w-full" 
                  onClick={handleSave}
                  disabled={updateSettingsMutation.isPending}
                >
                  Save AI Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Account */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Monitor className="h-5 w-5 mr-2" />
                Account
              </CardTitle>
              <CardDescription>
                Manage your session and account security.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Signed in as</Label>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
                <Button variant="destructive" onClick={logout}>
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
