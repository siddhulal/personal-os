"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/lib/auth";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { User, Palette, Info, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
