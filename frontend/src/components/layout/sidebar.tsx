"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useSidebar } from "@/lib/sidebar-context";
import {
  LayoutDashboard,
  CheckSquare,
  FolderKanban,
  FileText,
  Lightbulb,
  Target,
  GraduationCap,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  Network,
  Repeat,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tasks", href: "/tasks", icon: CheckSquare },
  { name: "Projects", href: "/projects", icon: FolderKanban },
  { name: "Notes", href: "/notes", icon: FileText, exact: true },
  { name: "Knowledge Graph", href: "/notes/graph", icon: Network },
  { name: "Flashcards", href: "/flashcards", icon: Layers },
  { name: "Habits", href: "/habits", icon: Repeat },
  { name: "Ideas", href: "/ideas", icon: Lightbulb },
  { name: "Goals", href: "/goals", icon: Target },
  { name: "Learning", href: "/learning", icon: GraduationCap },
  { name: "Interview Prep", href: "/interview", icon: MessageSquare },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Mobile toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 bg-card border-r border-border flex flex-col transition-all duration-200 md:translate-x-0",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-border shrink-0",
          collapsed ? "justify-center px-2" : "justify-between px-4"
        )}>
          {!collapsed && (
            <h1 className="text-xl font-bold tracking-tight">Life OS</h1>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden md:flex"
            onClick={toggle}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 py-4 space-y-1 overflow-y-auto",
          collapsed ? "px-2" : "px-3"
        )}>
          {navigation.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-colors",
                  collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className={cn(
          "border-t border-border space-y-1",
          collapsed ? "p-2" : "p-3"
        )}>
          {/* Theme toggle */}
          {mounted && (
            <Button
              variant="ghost"
              size={collapsed ? "icon" : "sm"}
              className={cn(
                "w-full",
                collapsed ? "justify-center" : "justify-start gap-3 px-3"
              )}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={collapsed ? "Toggle theme" : undefined}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 shrink-0" />
              ) : (
                <Moon className="h-4 w-4 shrink-0" />
              )}
              {!collapsed && (
                <span className="text-sm font-medium">
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
              )}
            </Button>
          )}

          {/* Settings */}
          <Link
            href="/settings"
            title={collapsed ? "Settings" : undefined}
            className={cn(
              "flex items-center rounded-lg text-sm font-medium transition-colors",
              collapsed ? "justify-center px-2 py-2" : "gap-3 px-3 py-2",
              pathname === "/settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>

          {/* User info */}
          {user && (
            <div className={cn(
              "flex items-center",
              collapsed ? "justify-center py-2" : "justify-between px-3 py-2"
            )}>
              {!collapsed && (
                <div className="text-sm min-w-0">
                  <p className="font-medium truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                className="h-8 w-8 shrink-0"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
