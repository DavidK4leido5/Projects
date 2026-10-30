"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { useBodyScrollLock, useEventListener } from "@/lib/hooks";
import { Minus, Plus, RotateCcw, X } from "lucide-react";

type View = { zoom: number; x: number; y: number };

const FULL: View = { zoom: 1, x: 0, y: 0 };
const clampZoom = (value: number) => Math.min(Math.max(value, 1), 4);

/**
 * Product photo plus a full-screen viewer. Zoom is anchored to the cursor, and
 * going back to 1x always returns to the fitted view.
 */
export function ZoomableImage({
  src,
  images,
  initialIndex,
  alt,
  width,
  height,
  sizes,
  priority,
  className,
}: {
  src: string;
  images: string[];
  initialIndex: number;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(initialIndex);
  const [view, setView] = useState<View>(FULL);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const current = images[index] ?? src;

  const close = useCallback(() => {
    setOpen(false);
    setView(FULL);
  }, []);

  /** Multiply the current zoom around a point measured from the stage centre. */
  const zoomBy = useCallback((factor: number, cx: number, cy: number) => {
    setView((value) => {
      const zoom = clampZoom(value.zoom * factor);
      if (zoom === value.zoom) return value;
      if (zoom === 1) return FULL;
      const ratio = zoom / value.zoom;
      return {
        zoom,
        x: cx - (cx - value.x) * ratio,
        y: cy - (cy - value.y) * ratio,
      };
    });
  }, []);

  /** Buttons and keys step by half a level, anchored at the stage centre. */
  const stepZoom = useCallback(
    (delta: number) => {
      const next = clampZoom(view.zoom + delta);
      zoomBy(next / view.zoom, 0, 0);
    },
    [view.zoom, zoomBy],
  );

  useBodyScrollLock(open);

  useEventListener(
    () => window,
    "keydown",
    (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === "Escape") close();
      if (key === "0") setView(FULL);
      if (key === "+") stepZoom(0.5);
      if (key === "-") stepZoom(-0.5);
    },
    { enabled: open },
  );

  // The wheel zooms toward the pointer, so the stage itself never scrolls.
  useEventListener(
    () => stageRef.current,
    "wheel",
    (event) => {
      const wheel = event as WheelEvent;
      wheel.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      zoomBy(
        wheel.deltaY < 0 ? 1.25 : 0.8,
        wheel.clientX - rect.left - rect.width / 2,
        wheel.clientY - rect.top - rect.height / 2,
      );
    },
    { enabled: open, passive: false },
  );

  if (!current) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(initialIndex);
          setView(FULL);
          setOpen(true);
        }}
        aria-label={"Open " + alt + " larger"}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border"
      >
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes={sizes}
          priority={priority}
          className={className}
        />
        <span className="pointer-events-none absolute bottom-2 right-2 rounded bg-background/80 px-2 py-1 text-[11px] text-foreground opacity-0 transition-opacity group-hover:opacity-100">
          Click to enlarge
        </span>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          className="fixed inset-0 z-50 flex h-dvh w-screen flex-col bg-neutral-950"
        >
          <div className="flex shrink-0 items-center justify-between px-4 py-2 text-white">
            <span className="text-xs text-white/70">{alt}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => stepZoom(-0.5)}
                className="rounded-full border border-white/20 p-2 hover:bg-white/10"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-xs tabular-nums text-white/70">
                {view.zoom.toFixed(2)}x
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => stepZoom(0.5)}
                className="rounded-full border border-white/20 p-2 hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Reset view"
                onClick={() => setView(FULL)}
                disabled={view.zoom === 1 && view.x === 0 && view.y === 0}
                className="rounded-full border border-white/20 p-2 hover:bg-white/10 disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Close"
                onClick={close}
                className="rounded-full border border-white/20 p-2 hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={stageRef}
            data-zoom={view.zoom}
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2"
            onPointerDown={(event) => {
              if (view.zoom === 1) return;
              drag.current = { x: event.clientX - view.x, y: event.clientY - view.y };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              setView((value) => ({
                ...value,
                x: event.clientX - drag.current!.x,
                y: event.clientY - drag.current!.y,
              }));
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onDoubleClick={() => setView(FULL)}
          >
            <Image
              src={current}
              alt={alt}
              width={width * 2}
              height={height * 2}
              sizes="100vw"
              draggable={false}
              style={{
                transform: "translate(" + view.x + "px, " + view.y + "px) scale(" + view.zoom + ")",
                transformOrigin: "center center",
              }}
              className="max-h-full max-w-full select-none object-contain transition-transform duration-150"
            />
          </div>

          {images.length > 1 ? (
            <div className="flex shrink-0 items-center justify-center gap-2 px-4 py-3">
              {images.map((key, position) => (
                <button
                  key={key}
                  type="button"
                  aria-label={"View image " + (position + 1)}
                  aria-current={position === index}
                  onClick={() => {
                    setIndex(position);
                    setView(FULL);
                  }}
                  className={
                    "h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors " +
                    (position === index
                      ? "border-white"
                      : "border-transparent opacity-60 hover:opacity-100")
                  }
                >
                  <Image
                    src={key}
                    alt=""
                    width={56}
                    height={56}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
