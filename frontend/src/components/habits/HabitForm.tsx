"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Habit } from "@/types";

interface HabitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: HabitFormData) => void;
  habit?: Habit | null;
  loading?: boolean;
}

export interface HabitFormData {
  name: string;
  description: string;
  frequency: string;
  frequencyDays: number[];
  category: string;
  color: string;
  isMicroHabit: boolean;
  microHabitCue: string;
  targetCount: number;
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

const CATEGORIES = [
  "Health", "Fitness", "Learning", "Mindfulness",
  "Productivity", "Social", "Creative", "Finance",
];

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 7, label: "Sun" },
];

export function HabitForm({ open, onOpenChange, onSubmit, habit, loading }: HabitFormProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("DAILY");
  const [frequencyDays, setFrequencyDays] = useState<number[]>([]);
  const [category, setCategory] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [isMicroHabit, setIsMicroHabit] = useState(false);
  const [microHabitCue, setMicroHabitCue] = useState("");
  const [targetCount, setTargetCount] = useState(1);

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setDescription(habit.description || "");
      setFrequency(habit.frequency);
      setFrequencyDays(habit.frequencyDays || []);
      setCategory(habit.category || "");
      setColor(habit.color);
      setIsMicroHabit(habit.isMicroHabit);
      setMicroHabitCue(habit.microHabitCue || "");
      setTargetCount(habit.targetCount);
    } else {
      setName("");
      setDescription("");
      setFrequency("DAILY");
      setFrequencyDays([]);
      setCategory("");
      setColor("#6366f1");
      setIsMicroHabit(false);
      setMicroHabitCue("");
      setTargetCount(1);
    }
  }, [habit, open]);

  function handleSubmit() {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      frequency,
      frequencyDays,
      category,
      color,
      isMicroHabit,
      microHabitCue: microHabitCue.trim(),
      targetCount,
    });
  }

  function toggleDay(day: number) {
    setFrequencyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{habit ? "Edit Habit" : "New Habit"}</DialogTitle>
          <DialogDescription>
            {habit ? "Update your habit details." : "Create a new habit to track."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="habit-name">Name *</Label>
            <Input
              id="habit-name"
              placeholder="e.g. Drink 8 glasses of water"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="habit-desc">Description</Label>
            <Input
              id="habit-desc"
              placeholder="Optional description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="CUSTOM">Custom Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {frequency === "CUSTOM" && (
            <div className="grid gap-2">
              <Label>Days</Label>
              <div className="flex gap-1.5">
                {DAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      frequencyDays.includes(day.value)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-all ${
                    color === c ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="target-count">Target Count</Label>
            <Input
              id="target-count"
              type="number"
              min={1}
              value={targetCount}
              onChange={(e) => setTargetCount(parseInt(e.target.value) || 1)}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="micro-habit"
              checked={isMicroHabit}
              onChange={(e) => setIsMicroHabit(e.target.checked)}
              className="rounded border-border"
            />
            <Label htmlFor="micro-habit" className="text-sm font-normal">
              This is a micro habit
            </Label>
          </div>

          {isMicroHabit && (
            <div className="grid gap-2">
              <Label htmlFor="cue">Habit Cue</Label>
              <Input
                id="cue"
                placeholder="e.g. After I pour my morning coffee..."
                value={microHabitCue}
                onChange={(e) => setMicroHabitCue(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || loading}>
            {loading ? "Saving..." : habit ? "Update" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
