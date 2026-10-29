"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { Minus, Plus, X } from "lucide-react";

/**
 * Product photo with a full-screen viewer. The page image stays put; clicking it
 * opens the lightbox, where click or the zoom buttons change magnification and
 * the wheel does the same.
 */
export function ZoomableImage({
  src,
  alt,
  width,
  height,
  sizes,
  priority,
  className,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const close = useCallback(() => {
    setOpen(false);
    setZoom(1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key === "+") setZoom((value) => Math.min(value + 0.5, 4));
      if (event.key === "-") setZoom((value) => Math.max(value - 0.5, 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
          className="fixed inset-0 z-50 flex flex-col bg-neutral-950"
          onClick={close}
          onWheel={(event) => {
            event.preventDefault();
            setZoom((value) => Math.min(Math.max(value + (event.deltaY < 0 ? 0.25 : -0.25), 1), 4));
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-xs text-white/70">{alt}</span>
            <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                aria-label="Zoom out"
                onClick={() => setZoom((value) => Math.max(value - 0.5, 1))}
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
                onClick={() => setZoom((value) => Math.min(value + 0.5, 4))}
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

          <div className="flex-1 overflow-auto p-4">
            <div
              className="mx-auto"
              style={{ width: zoom * 100 + "%", maxWidth: zoom === 1 ? "100%" : "none" }}
              onClick={(event) => event.stopPropagation()}
            >
              <Image
                src={src}
                alt={alt}
                width={width * 2}
                height={height * 2}
                sizes="100vw"
                className="h-auto w-full rounded-md object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
