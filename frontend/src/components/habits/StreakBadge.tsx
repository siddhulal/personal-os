"use client";

import { Flame } from "lucide-react";

interface StreakBadgeProps {
  streak: number;
  size?: "sm" | "md";
}

export function StreakBadge({ streak, size = "sm" }: StreakBadgeProps) {
  if (streak === 0) return null;

  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full font-medium ${sizeClasses} ${
        streak >= 7
          ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      }`}
    >
      <Flame className={iconSize} />
      {streak}
    </span>
  );
}
