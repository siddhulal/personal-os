"use client";

import { Check } from "lucide-react";

interface HabitCheckboxProps {
  checked: boolean;
  color: string;
  onToggle: () => void;
  disabled?: boolean;
}

export function HabitCheckbox({ checked, color, onToggle, disabled }: HabitCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
        checked
          ? "scale-110"
          : "hover:scale-105 bg-transparent"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      style={{
        borderColor: color,
        backgroundColor: checked ? color : "transparent",
      }}
    >
      {checked && <Check className="h-4 w-4 text-white" />}
    </button>
  );
}
