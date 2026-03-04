"use client";

import Link from "next/link";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HabitCheckbox } from "./HabitCheckbox";
import { StreakBadge } from "./StreakBadge";
import type { Habit } from "@/types";

interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string) => void;
  onEdit: (habit: Habit) => void;
  onDelete: (id: string) => void;
  toggling?: boolean;
}

export function HabitCard({ habit, onToggle, onEdit, onDelete, toggling }: HabitCardProps) {
  return (
    <div className="group rounded-lg border p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-3">
        <HabitCheckbox
          checked={habit.completedToday}
          color={habit.color}
          onToggle={() => onToggle(habit.id)}
          disabled={toggling}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={`/habits/${habit.id}`}
              className="font-medium text-sm hover:underline truncate"
            >
              {habit.name}
            </Link>
            <StreakBadge streak={habit.currentStreak} />
          </div>
          {habit.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {habit.description}
            </p>
          )}
          {habit.isMicroHabit && habit.microHabitCue && (
            <p className="text-xs text-primary mt-1">
              Cue: {habit.microHabitCue}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5">
            {habit.category && (
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {habit.category}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {habit.frequency === "DAILY"
                ? "Daily"
                : habit.frequency === "WEEKLY"
                  ? "Weekly"
                  : "Custom"}
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(habit)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(habit.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
