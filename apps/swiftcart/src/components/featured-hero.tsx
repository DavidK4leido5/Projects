"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { useEventListener, useInterval, useMediaQuery } from "@/lib/hooks";

export type HeroSlide = {
  id: string;
  slug: string;
  name: string;
  wideSrcSet?: string;
  tallSrc: string;
  tallSrcSet?: string;
};

const INTERVAL_MS = 5500;
/** A drag has to travel this far before it counts as a slide change. */
const DRAG_MIN_PX = 10;

export function FeaturedHero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    axis: "none" | "x" | "y";
  } | null>(null);
  const suppressClick = useRef(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (count < 2) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Dots and arrows keep their own click behaviour.
    if ((event.target as HTMLElement).closest("button")) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: "none" };
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const state = drag.current;
    if (!state || state.id !== event.pointerId) return;
    const dx = event.clientX - state.x;
    const dy = event.clientY - state.y;
    if (state.axis === "none") {
      if (Math.abs(dx) < DRAG_MIN_PX && Math.abs(dy) < DRAG_MIN_PX) return;
      // Vertical gestures belong to the page, horizontal ones to the carousel.
      state.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (state.axis === "x") {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
        setPaused(true);
      }
    }
    if (state.axis !== "x") return;
    setOffset(dx);
  }

  function endDrag(event: React.PointerEvent<HTMLElement>) {
    const state = drag.current;
    drag.current = null;
    if (!state || state.axis !== "x") {
      setDragging(false);
      setOffset(0);
      return;
    }
    const dx = event.clientX - state.x;
    const width = frameRef.current?.offsetWidth ?? 0;
    const threshold = Math.min(Math.max(width * 0.12, 40), 120);
    setDragging(false);
    setOffset(0);
    setPaused(false);
    suppressClick.current = Math.abs(dx) >= DRAG_MIN_PX;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 400);
    if (Math.abs(dx) >= threshold) go(index + (dx < 0 ? 1 : -1));
  }

  // A drag that ends on a slide must not follow that slide's link.
  function onClickCapture(event: React.MouseEvent) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

  useInterval(
    () => setIndex((current) => (current + 1) % count),
    count > 1 && !paused && !reducedMotion ? INTERVAL_MS : null,
  );

  useEventListener(
    () => window,
    "keydown",
    (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === "ArrowRight") setIndex((current) => (current + 1) % count);
      if (key === "ArrowLeft") setIndex((current) => (current - 1 + count) % count);
    },
    { enabled: count > 1 },
  );

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured products"
      className="relative touch-pan-y overflow-hidden bg-neutral-950 select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onClickCapture={onClickCapture}
      onDragStart={(event) => event.preventDefault()}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/*
        Full bleed. The desktop frame is ~2.5:1 through the usual desktop widths,
        which is why the required banner is 5:2 rather than 16:9: the artwork is
        authored for the band instead of being cropped into it.
      */}
      <div
        ref={frameRef}
        className={
          "relative aspect-[9/16] w-full cursor-grab overflow-hidden sm:aspect-[3168/1344] " +
          (dragging ? "cursor-grabbing" : "")
        }
      >
        <div
          className={
            "absolute inset-0 " + (dragging ? "" : "transition-transform duration-300 ease-out")
          }
          style={offset === 0 ? undefined : { transform: "translate3d(" + offset + "px,0,0)" }}
        >
          {slides.map((slide, slideIndex) => {
            const active = slideIndex === index;
            return (
              <Link
                key={slide.id}
                href={"/products/" + slide.slug}
                aria-hidden={!active}
                tabIndex={active ? 0 : -1}
                className={
                  "absolute inset-0 block transition-opacity duration-700 ease-out " +
                  (active ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0")
                }
              >
                <picture>
                  <source media="(min-width: 640px)" srcSet={slide.wideSrcSet} sizes="100vw" />
                  <img
                    src={slide.tallSrc}
                    srcSet={slide.tallSrcSet}
                    sizes="100vw"
                    alt={slide.name}
                    fetchPriority={active ? "high" : "low"}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                </picture>
              </Link>
            );
          })}
        </div>

        {count > 1 ? (
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => go(slideIndex)}
                aria-label={"Show " + slide.name}
                aria-current={slideIndex === index}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (slideIndex === index ? "w-7 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70")
                }
              />
            ))}
          </div>
        ) : null}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous featured product"
            className="absolute left-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-neutral-900/60 text-white backdrop-blur transition-colors hover:bg-neutral-800 lg:flex"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m14 6-6 6 6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next featured product"
            className="absolute right-4 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-neutral-900/60 text-white backdrop-blur transition-colors hover:bg-neutral-800 lg:flex"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="m10 6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </>
      ) : null}
    </section>
  );
}
