"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw, FileText } from "lucide-react";

interface ResumePdfViewerProps {
  pdfUrl: string;
}

export default function ResumePdfViewer({ pdfUrl }: ResumePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const renderPdf = useCallback(async () => {
    if (!pdfUrl) return;
    setLoading(true);
    setError(null);

    try {
      // Dynamically import pdfjs-dist
      const pdfjs = await import("pdfjs-dist");

      // Use local worker for fast, offline, and reliable execution without CDN dependency
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
      }

      const loadingTask = pdfjs.getDocument(pdfUrl);
      const pdf = await loadingTask.promise;

      const container = containerRef.current;
      if (!container) return;

      container.innerHTML = "";

      // Get exact width of container
      const containerWidth = container.clientWidth || 320;
      const pixelRatio = typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2;

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const unscaledViewport = page.getViewport({ scale: 1 });

        // Calculate scale to fill 100% of container width
        const scale = (containerWidth / unscaledViewport.width) * pixelRatio;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.className = "w-full max-w-full bg-white block border-b border-[var(--border)] last:border-b-0";
        canvas.style.width = "100%";
        canvas.style.maxWidth = "100%";
        canvas.style.height = "auto";
        canvas.style.display = "block";
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const context = canvas.getContext("2d");
        if (!context) continue;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        container.appendChild(canvas);
        await page.render(renderContext).promise;
      }

      setLoading(false);
    } catch (err: unknown) {
      console.error("PDF.js render error:", err);
      setError("Failed to render PDF preview via canvas.");
      setLoading(false);
    }
  }, [pdfUrl]);

  useEffect(() => {
    renderPdf();

    // Re-render when container resizes to keep 100% width coverage
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    let timeoutId: NodeJS.Timeout;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        renderPdf();
      }, 250);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [renderPdf]);

  return (
    <div
      style={{ backgroundColor: "var(--surface)" }}
      className="flex-1 min-h-0 w-full h-full flex flex-col relative overflow-hidden"
    >
      {loading && (
        <div className="absolute inset-0 bg-white/90 z-20 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-[var(--navy-700)] animate-spin" />
          <span style={{ color: "var(--navy-900)" }} className="text-xs font-semibold">
            Rendering full-width resume...
          </span>
        </div>
      )}

      {error ? (
        <div className="flex-1 min-h-0 p-6 flex flex-col items-center justify-center text-center">
          <FileText className="w-8 h-8 text-[var(--text-muted)] mb-2" />
          <p style={{ color: "var(--navy-900)" }} className="text-xs font-medium mb-3">
            {error}
          </p>
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ backgroundColor: "var(--teal-600)", color: "var(--surface)" }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-xs hover:bg-[var(--teal-700)] transition"
          >
            Open in Browser
          </a>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="flex-1 min-h-0 w-full h-full overflow-y-auto overflow-x-hidden p-0 bg-white delta-scrollbar"
          style={{ width: "100%" }}
        />
      )}
    </div>
  );
}
