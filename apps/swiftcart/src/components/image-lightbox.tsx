"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Minus, Plus, X } from "lucide-react";

/**
 * Product photo plus a full-screen viewer. The viewer never scrolls: the image
 * is contained in the viewport, the wheel changes magnification, dragging pans
 * when zoomed, and the strip underneath switches images.
 */
export function ZoomableImage({
  images,
  initialIndex,
  alt,
  width,
  height,
  sizes,
  priority,
  className,
}: {
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
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const current = images[index] ?? images[0];
  const clamp = (value: number) => Math.min(Math.max(value, 1), 4);

  const close = useCallback(() => {
    setOpen(false);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "+") setZoom((value) => clamp(value + 0.5));
      if (event.key === "-") setZoom((value) => clamp(value - 0.5));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  // Wheel zooms instead of scrolling, so the stage never moves.
  useEffect(() => {
    const stage = stageRef.current;
    if (!open || !stage) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      setZoom((value) => clamp(value + (event.deltaY < 0 ? 0.25 : -0.25)));
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [open]);

  if (!current) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIndex(initialIndex);
          setOpen(true);
        }}
        aria-label={"Open " + alt + " larger"}
        className="group relative block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border"
      >
        <Image
          src={current}
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
                onClick={() => setZoom((value) => clamp(value - 0.5))}
                className="rounded-full border border-white/20 p-2 hover:bg-white/10"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center text-xs tabular-nums text-white/70">
                {zoom.toFixed(1)}x
              </span>
              <button
                type="button"
                aria-label="Zoom in"
                onClick={() => setZoom((value) => clamp(value + 0.5))}
                className="rounded-full border border-white/20 p-2 hover:bg-white/10"
              >
                <Plus className="h-4 w-4" />
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
            className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2"
            onPointerDown={(event) => {
              if (zoom === 1) return;
              drag.current = { x: event.clientX - offset.x, y: event.clientY - offset.y };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!drag.current) return;
              setOffset({ x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
          >
            <Image
              src={current}
              alt={alt}
              width={width * 2}
              height={height * 2}
              sizes="100vw"
              draggable={false}
              style={{
                transform: "translate(" + offset.x + "px, " + offset.y + "px) scale(" + zoom + ")",
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
                    setZoom(1);
                    setOffset({ x: 0, y: 0 });
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
