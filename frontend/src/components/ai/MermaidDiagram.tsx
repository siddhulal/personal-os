"use client";

import { useEffect, useRef, useState } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react";

interface MermaidDiagramProps {
  chart: string;
}

const CLOSE_BRACKET: Record<string, string> = { "[": "]", "(": ")", "{": "}" };
const SPECIAL_CHARS = /[()[\]{}<>&#;]/;

// Sanitize Mermaid chart text to fix common AI-generated syntax issues.
// Uses proper bracket-depth matching so nested parens like ([(ngModel)]) are handled.
function sanitizeChart(raw: string): string {
  return raw
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      // Skip directive / style / empty lines
      if (
        !trimmed ||
        trimmed.startsWith("%%") ||
        trimmed.startsWith("graph ") ||
        trimmed.startsWith("flowchart ") ||
        trimmed.startsWith("classDef ") ||
        trimmed.startsWith("style ") ||
        trimmed.startsWith("linkStyle ")
      ) {
        // Remove trailing semicolons on style lines too
        return line.replace(/;\s*$/, "");
      }

      // Remove trailing semicolons
      let l = line.replace(/;\s*$/, "");

      // Walk through the line and quote labels that contain special chars
      let result = "";
      let i = 0;
      while (i < l.length) {
        const ch = l[i];
        // Detect node label start: a word char immediately before [ ( or {
        if ((ch === "[" || ch === "(" || ch === "{") && i > 0 && /\w/.test(l[i - 1])) {
          const open = ch;
          const close = CLOSE_BRACKET[open];
          // Find matching close bracket with depth tracking
          let depth = 1;
          let j = i + 1;
          while (j < l.length && depth > 0) {
            if (l[j] === open) depth++;
            else if (l[j] === close) depth--;
            j++;
          }
          const content = l.slice(i + 1, j - 1);
          // Already quoted — keep as is
          if (content.startsWith('"') && content.endsWith('"')) {
            result += open + content + close;
          } else if (SPECIAL_CHARS.test(content)) {
            result += open + '"' + content.replace(/"/g, "'") + '"' + close;
          } else {
            result += open + content + close;
          }
          i = j;
        } else {
          result += ch;
          i++;
        }
      }
      return result;
    })
    .join("\n");
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      const sanitized = sanitizeChart(chart);

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg: renderedSvg } = await mermaid.render(id, sanitized);
        if (!cancelled) {
          setSvg(renderedSvg);
          setError("");
        }
      } catch {
        // Retry with original if sanitization caused issues
        try {
          const mermaid = (await import("mermaid")).default;
          const id = `mermaid-retry-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const { svg: renderedSvg } = await mermaid.render(id, chart);
          if (!cancelled) {
            setSvg(renderedSvg);
            setError("");
          }
        } catch (err) {
          if (!cancelled) {
            setError("Failed to render diagram");
            console.error("Mermaid render error:", err);
          }
        }
      }
    }

    renderChart();
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
        {error}
        <pre className="mt-2 text-xs overflow-x-auto">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-4 text-muted-foreground text-sm">
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
          onClick={() => setZoom(1)}
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
      <div className="overflow-auto bg-white dark:bg-gray-900 rounded border border-border p-4 max-h-[60vh]">
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
