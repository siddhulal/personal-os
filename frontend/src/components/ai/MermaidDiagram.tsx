"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";
import { sanitizeMermaidAttempts } from "@/lib/mermaid-utils";

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [zoom, setZoom] = useState(1);

  // Mouse wheel zoom - only if Ctrl/Cmd is held
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.25, Math.min(3, z + delta)));
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      const mermaid = (await import("mermaid")).default;
      const isDark = document.documentElement.classList.contains("dark");
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? "dark" : "default",
        securityLevel: "loose",
        themeVariables: isDark ? {
          primaryColor: "#6366f1",
          primaryTextColor: "#f1f5f9",
          primaryBorderColor: "#818cf8",
          lineColor: "#94a3b8",
          secondaryColor: "#1e293b",
          tertiaryColor: "#0f172a",
          noteBkgColor: "#1e293b",
          noteTextColor: "#e2e8f0",
          clusterBkg: "#1e293b",
          clusterBorder: "#334155",
          edgeLabelBackground: "#1e293b",
        } : {
          primaryColor: "#8b5cf6",
          primaryTextColor: "#1e293b",
          primaryBorderColor: "#7c3aed",
          lineColor: "#64748b",
          secondaryColor: "#ede9fe",
          tertiaryColor: "#f5f3ff",
          noteBkgColor: "#f5f3ff",
          noteTextColor: "#1e293b",
          clusterBkg: "#f8fafc",
          clusterBorder: "#e2e8f0",
        },
      });

      // Strategy: try original first, then progressively more aggressive sanitizations.
      const sanitized = sanitizeMermaidAttempts(chart);
      const attempts = [
        { label: "original", code: chart },
        ...sanitized.map((code, i) => ({ label: `sanitized_${i}`, code })),
      ];

      // Deduplicate attempts (skip any that match the original or a previous attempt)
      const seen = new Set<string>();
      const unique = attempts.filter((a) => {
        const key = a.code.trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      for (let i = 0; i < unique.length; i++) {
        try {
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const { svg: renderedSvg } = await mermaid.render(id, unique[i].code);
          if (!cancelled) {
            setSvg(renderedSvg);
            setError("");
          }
          return; // success — stop trying
        } catch (err) {
          // If this was the last attempt, show the error
          if (i === unique.length - 1) {
            if (!cancelled) {
              setError("Failed to render diagram");
              console.error("Mermaid render error:", err);
              console.error("Attempted codes:", unique.map(a => `[${a.label}]:\n${a.code}`).join("\n\n"));
            }
          }
          // Otherwise, continue to next attempt
        }
      }
    }

    if (chart.trim()) renderChart();
    return () => { cancelled = true; };
  }, [chart]);

  function handleDownloadPng() {
    if (!containerRef.current) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const scale = 2; // Higher res export
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const a = document.createElement("a");
      a.download = "diagram.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-3 text-sm text-red-600 dark:text-red-400">
        <div className="flex items-center justify-between">
          <span>{error}</span>
          <button
            className="text-xs underline opacity-60 hover:opacity-100"
            onClick={() => {
              // Copy the raw mermaid code for debugging
              navigator.clipboard.writeText(chart);
            }}
          >
            Copy source
          </button>
        </div>
        <pre className="mt-2 text-xs overflow-x-auto bg-white/50 dark:bg-black/20 p-2 rounded max-h-[200px]">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground text-sm">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
        Rendering diagram...
      </div>
    );
  }

  const btnClass =
    "h-7 w-7 flex items-center justify-center rounded bg-muted hover:bg-muted/80 transition-colors text-muted-foreground";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 justify-end">
        <button
          type="button"
          className={btnClass}
          onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <span className="text-xs text-muted-foreground w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className={btnClass}
          onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={() => { setZoom(1); }}
          title="Reset zoom"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={btnClass}
          onClick={handleDownloadPng}
          title="Download as PNG"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>
      <div 
        className="overflow-auto bg-white dark:bg-gray-900 rounded border border-border p-4 max-h-[60vh]"
        onWheel={handleWheel}
      >
        <div
          ref={containerRef}
          className="[&_svg]:mx-auto transition-transform origin-top-left"
          style={{ transform: `scale(${zoom})` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}
