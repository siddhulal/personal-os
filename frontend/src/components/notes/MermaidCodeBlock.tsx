"use client";

import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { useEffect, useRef, useState, useCallback } from "react";
import { Eye, Code, ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Minimize2, Move } from "lucide-react";
import { sanitizeMermaidAttempts } from "@/lib/mermaid-utils";

function MermaidPreview({ code, fullscreen, onToggleFullscreen }: {
  code: string;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  // Pan state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        const isDark = document.documentElement.classList.contains("dark");
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "default",
          securityLevel: "loose",
          flowchart: { useMaxWidth: true },
        });
        // Try original first, then progressively sanitized versions
        const sanitized = sanitizeMermaidAttempts(code);
        const attempts = [code, ...sanitized];
        const seen = new Set<string>();
        const unique = attempts.filter((c) => {
          const key = c.trim();
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        for (let i = 0; i < unique.length; i++) {
          try {
            const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            document.querySelectorAll(`#d${id}`).forEach((el) => el.remove());
            const { svg: rendered } = await mermaid.render(id, unique[i]);
            if (!cancelled) {
              setSvg(rendered);
              setError("");
            }
            return;
          } catch (err: any) {
            if (i === unique.length - 1) {
              if (!cancelled) {
                const msg = err?.message || err?.str || String(err);
                setError(msg.length > 200 ? msg.slice(0, 200) + "..." : msg);
                console.error("Mermaid render error:", err);
              }
            }
          }
        }
      } catch (err: any) {
        if (!cancelled) {
          const msg = err?.message || err?.str || String(err);
          setError(msg.length > 200 ? msg.slice(0, 200) + "..." : msg);
          console.error("Mermaid render error:", err);
        }
      }
    }

    if (code.trim()) render();
    return () => { cancelled = true; };
  }, [code]);

  // Mouse wheel zoom - only if Ctrl/Cmd is held to prevent accidental zooming while scrolling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setZoom((z) => Math.max(0.2, Math.min(5, z + delta)));
    }
  }, []);

  // Pan handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function fitToView() {
    if (!containerRef.current || !viewportRef.current) return;
    const svgEl = containerRef.current.querySelector("svg");
    if (!svgEl) return;
    const svgRect = svgEl.getBoundingClientRect();
    const vpRect = viewportRef.current.getBoundingClientRect();
    const scaleX = vpRect.width / (svgRect.width / zoom);
    const scaleY = vpRect.height / (svgRect.height / zoom);
    const newZoom = Math.min(scaleX, scaleY, 3) * 0.9; // 90% to add padding
    setZoom(newZoom);
    setPan({ x: 0, y: 0 });
  }

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
      const scale = 2;
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
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground text-sm">
        Rendering diagram...
      </div>
    );
  }

  const btnClass =
    "h-7 w-7 flex items-center justify-center rounded bg-muted/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground";

  const viewportHeight = fullscreen ? "h-[calc(100vh-4rem)]" : "h-[60vh] min-h-[400px]";

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-1 justify-between px-2 py-1.5 bg-muted/30 border-b border-border/50">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Move className="h-3 w-3" />
          <span>Drag to pan &middot; Scroll to zoom</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" className={btnClass} onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))} title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-xs text-muted-foreground w-10 text-center font-mono">
            {Math.round(zoom * 100)}%
          </span>
          <button type="button" className={btnClass} onClick={() => setZoom((z) => Math.min(5, z + 0.15))} title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button type="button" className={btnClass} onClick={fitToView} title="Fit to view">
            <Minimize2 className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={btnClass} onClick={resetView} title="Reset view">
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button type="button" className={btnClass} onClick={handleDownloadPng} title="Download PNG">
            <Download className="h-3.5 w-3.5" />
          </button>
          {onToggleFullscreen && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <button type="button" className={btnClass} onClick={onToggleFullscreen} title={fullscreen ? "Exit fullscreen" : "Fullscreen"}>
                {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Diagram viewport */}
      <div
        ref={viewportRef}
        className={`${viewportHeight} overflow-hidden bg-white dark:bg-gray-950 rounded-b ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={containerRef}
          className="[&_svg]:mx-auto transition-transform duration-75 origin-center w-full h-full flex items-center justify-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CodeBlockComponent({ node, updateAttributes }: any) {
  const language = (node.attrs.language || "") as string;
  const isMermaid = language === "mermaid";
  const [showCode, setShowCode] = useState(!isMermaid);
  const [fullscreen, setFullscreen] = useState(false);

  // When language changes to/from mermaid, toggle view
  useEffect(() => {
    setShowCode(!isMermaid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  // Escape key closes fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullscreen]);

  // Fullscreen overlay
  if (isMermaid && !showCode && fullscreen) {
    return (
      <NodeViewWrapper className="relative my-4">
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col" contentEditable={false}>
          {/* Fullscreen header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-medium">Mermaid Diagram</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCode(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
              >
                <Code className="h-3 w-3" />
                Edit Code
              </button>
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
              >
                <Minimize2 className="h-3.5 w-3.5" />
                Exit
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <MermaidPreview
              code={node.textContent}
              fullscreen
              onToggleFullscreen={() => setFullscreen(false)}
            />
          </div>
        </div>
        {/* Keep the hidden code content for TipTap */}
        <div className="sr-only">
          <pre><NodeViewContent as="code" /></pre>
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className="relative my-4">
      {/* Language selector + view toggle */}
      <div className="flex items-center justify-between bg-muted/50 rounded-t border border-b-0 border-border px-3 py-1.5">
        <div className="flex items-center gap-2">
          <select
            value={language || ""}
            onChange={(e) => updateAttributes({ language: e.target.value })}
            className="text-xs bg-transparent border-none outline-none text-muted-foreground cursor-pointer"
            contentEditable={false}
          >
            <option value="">auto</option>
            <option value="javascript">javascript</option>
            <option value="typescript">typescript</option>
            <option value="python">python</option>
            <option value="java">java</option>
            <option value="html">html</option>
            <option value="css">css</option>
            <option value="json">json</option>
            <option value="sql">sql</option>
            <option value="bash">bash</option>
            <option value="markdown">markdown</option>
            <option value="mermaid">mermaid</option>
          </select>
        </div>
        {isMermaid && (
          <div className="flex items-center gap-2" contentEditable={false}>
            {!showCode && (
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Maximize2 className="h-3 w-3" />
                Fullscreen
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowCode((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showCode ? (
                <>
                  <Eye className="h-3 w-3" />
                  Preview
                </>
              ) : (
                <>
                  <Code className="h-3 w-3" />
                  Edit
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Code editor (always present for editing, hidden when showing preview) */}
      <div className={isMermaid && !showCode ? "sr-only" : ""}>
        <pre className="!mt-0 !rounded-t-none">
          <NodeViewContent as="code" />
        </pre>
      </div>

      {/* Mermaid preview */}
      {isMermaid && !showCode && (
        <div className="border border-t-0 border-border rounded-b overflow-hidden" contentEditable={false}>
          <MermaidPreview
            code={node.textContent}
            onToggleFullscreen={() => setFullscreen(true)}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
}

export function createMermaidCodeBlock(lowlight: unknown) {
  return CodeBlockLowlight.extend({
    addNodeView() {
      return ReactNodeViewRenderer(CodeBlockComponent);
    },
  }).configure({
    lowlight,
  });
}
