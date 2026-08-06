"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export function ZoomableDocument({
  children,
  actions,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [zoom, setZoom] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.target.scrollWidth, height: entry.target.scrollHeight });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100))}
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="size-4" />
          </Button>
          <span className="w-12 text-center text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100))}
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomIn className="size-4" />
          </Button>
          {zoom !== 1 && (
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setZoom(1)}>
              <RotateCcw className="size-4" />
            </Button>
          )}
        </div>
        {actions}
      </div>
      <div className="max-h-[80vh] overflow-auto rounded-md border bg-muted/20">
        <div
          className="mx-auto"
          style={{
            width: size ? size.width * zoom : undefined,
            height: size ? size.height * zoom : undefined,
          }}
        >
          <div ref={contentRef} className="w-fit origin-top-left" style={{ transform: `scale(${zoom})` }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
