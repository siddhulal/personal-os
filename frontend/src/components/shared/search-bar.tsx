"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Search, CheckSquare, FileText, Lightbulb, HelpCircle } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "task" | "note" | "idea" | "question";
  title: string;
  snippet?: string;
}

interface SearchResponse {
  results: SearchResult[];
}

const typeConfig = {
  task: { label: "Tasks", icon: CheckSquare, href: "/tasks" },
  note: { label: "Notes", icon: FileText, href: "/notes" },
  idea: { label: "Ideas", icon: Lightbulb, href: "/ideas" },
  question: { label: "Questions", icon: HelpCircle, href: "/interview" },
};

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.get<SearchResponse>(
        `/api/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      setResults(response.data.results);
      setIsOpen(true);
      setActiveIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, performSearch]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navigateToResult = (result: SearchResult) => {
    const config = typeConfig[result.type];
    if (config) {
      router.push(`${config.href}/${result.id}`);
    }
    setIsOpen(false);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      navigateToResult(results[activeIndex]);
    }
  };

  // Group results by type
  const groupedResults = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {});

  // Build a flat index mapping so keyboard navigation works across groups
  let flatIndex = 0;
  const buildFlatIndex = (result: SearchResult): number => {
    return flatIndex++;
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search tasks, notes, ideas..."
          className="pl-10 h-10 bg-card"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50 max-h-96 overflow-y-auto">
          {results.length === 0 && !isLoading ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No results found for &quot;{query}&quot;
            </div>
          ) : (
            <div className="py-1">
              {(() => {
                flatIndex = 0;
                return Object.entries(groupedResults).map(([type, items]) => {
                  const config = typeConfig[type as keyof typeof typeConfig];
                  if (!config) return null;

                  return (
                    <div key={type}>
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                        {config.label}
                      </div>
                      {items.map((result) => {
                        const currentIndex = buildFlatIndex(result);
                        const isActive = currentIndex === activeIndex;
                        const Icon = config.icon;

                        return (
                          <button
                            key={result.id}
                            onClick={() => navigateToResult(result)}
                            onMouseEnter={() => setActiveIndex(currentIndex)}
                            className={cn(
                              "w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors",
                              isActive ? "bg-accent" : "hover:bg-accent/50"
                            )}
                          >
                            <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{result.title}</p>
                              {result.snippet && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                  {result.snippet}
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
