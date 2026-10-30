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
const TRANSITION = "transform 520ms cubic-bezier(0.22, 0.61, 0.36, 1)";

type TrackSlide = { key: string; slide: HeroSlide };

/**
 * The carousel is a track: slides sit side by side and the track translates, so
 * a change is a real slide rather than a crossfade. A clone of the last slide
 * before the first, and of the first after the last, let it wrap without
 * rewinding across the whole set.
 */
export function FeaturedHero({ slides }: { slides: HeroSlide[] }) {
  const count = slides.length;
  const loop = count > 1;

  // Position in track space: 1..count are the real slides, 0 and count+1 the
  // clones. The visible index is derived, never stored separately.
  const [position, setPosition] = useState(loop ? 1 : 0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; axis: "none" | "x" | "y" } | null>(null);
  const suppressClick = useRef(false);
  const offsetRef = useRef(0);

  const index = loop ? (((position - 1) % count) + count) % count : 0;
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  // loop implies at least two slides, so both ends exist.
  const track: TrackSlide[] = loop
    ? [
        { key: slides[count - 1]!.id + "-clone-end", slide: slides[count - 1]! },
        ...slides.map((slide) => ({ key: slide.id, slide })),
        { key: slides[0]!.id + "-clone-start", slide: slides[0]! },
      ]
    : slides.map((slide) => ({ key: slide.id, slide }));

  /**
   * Track positions 1..count are the real slides, 0 and count+1 the clones. A
   * step always starts from a real slide, so repeated input during the wrap
   * animation can never walk off the track into empty space.
   */
  const realPosition = useCallback(
    (current: number) => (current === 0 ? count : current === count + 1 ? 1 : current),
    [count],
  );

  /** Moves by one slide, wrapping through the clones. */
  const step = useCallback(
    (direction: 1 | -1) => {
      if (!loop) return;
      setOffset(0);
      setPosition((current) => {
        const next = realPosition(current) + direction;
        // Reduced motion never animates onto a clone, so wrap in place.
        if (reducedMotion) return ((((next - 1) % count) + count) % count) + 1;
        return next;
      });
      setAnimate(!reducedMotion);
    },
    [count, loop, realPosition, reducedMotion],
  );

  const goTo = useCallback(
    (next: number) => {
      if (!loop) return;
      setAnimate(!reducedMotion);
      setOffset(0);
      setPosition(next + 1);
    },
    [loop, reducedMotion],
  );

  // Once the track lands on a clone, swap to the real slide without animating.
  function onTransitionEnd(event: React.TransitionEvent<HTMLDivElement>) {
    if (event.propertyName !== "transform" || !loop) return;
    if (position === 0) {
      setAnimate(false);
      setPosition(count);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    } else if (position === count + 1) {
      setAnimate(false);
      setPosition(1);
      requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
    }
  }

  useInterval(() => step(1), loop && !paused && !reducedMotion && !dragging ? INTERVAL_MS : null);

  useEventListener(
    () => window,
    "keydown",
    (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === "ArrowRight") step(1);
      if (key === "ArrowLeft") step(-1);
    },
    { enabled: loop },
  );

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (!loop) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, axis: "none" };
    offsetRef.current = 0;
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
        setAnimate(false);
        setDragging(true);
        setPaused(true);
      }
    }
    if (state.axis !== "x") return;
    // Keep the track inside its own strip: from the clone on the left to the
    // clone on the right. Without this the drag can pull past the last clone
    // and show the empty background.
    const width = frameRef.current?.offsetWidth ?? 0;
    const min = Math.max((position - count - 1) * width, -width);
    const max = Math.min(position * width, width);
    const clamped = Math.max(min, Math.min(max, dx));
    offsetRef.current = clamped;
    setOffset(clamped);
  }

  function endDrag() {
    const state = drag.current;
    drag.current = null;
    if (!state || state.axis !== "x") {
      setDragging(false);
      setOffset(0);
      offsetRef.current = 0;
      return;
    }
    const dx = offsetRef.current;
    const width = frameRef.current?.offsetWidth ?? 0;
    const threshold = Math.min(Math.max(width * 0.12, 40), 120);
    setDragging(false);
    setPaused(false);
    suppressClick.current = Math.abs(dx) >= DRAG_MIN_PX;
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 400);

    if (Math.abs(dx) >= threshold) {
      setAnimate(!reducedMotion);
      setOffset(0);
      setPosition((current) => {
        const next = realPosition(current) + (dx < 0 ? 1 : -1);
        if (reducedMotion) return ((((next - 1) % count) + count) % count) + 1;
        return next;
      });
    } else {
      // Not far enough: spring back to the current slide.
      setAnimate(!reducedMotion);
      setOffset(0);
    }
  }

  // A drag that ends on a slide must not follow that slide's link.
  function onClickCapture(event: React.MouseEvent) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }

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
          className="flex h-full w-full"
          style={{
            transform: "translate3d(calc(" + -position * 100 + "% + " + offset + "px), 0, 0)",
            transition: animate ? TRANSITION : "none",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {track.map((entry, trackIndex) => {
            const active = trackIndex === position;
            return (
              <Link
                key={entry.key}
                href={"/products/" + entry.slide.slug}
                aria-hidden={!active}
                aria-label={entry.slide.name}
                tabIndex={active ? 0 : -1}
                draggable={false}
                className="relative h-full w-full shrink-0"
              >
                <picture>
                  <source
                    media="(min-width: 640px)"
                    srcSet={entry.slide.wideSrcSet}
                    sizes="100vw"
                  />
                  <img
                    src={entry.slide.tallSrc}
                    srcSet={entry.slide.tallSrcSet}
                    sizes="100vw"
                    alt={entry.slide.name}
                    fetchPriority={active ? "high" : "low"}
                    draggable={false}
                    className="absolute inset-0 h-full w-full object-cover object-center"
                  />
                </picture>
              </Link>
            );
          })}
        </div>

        {loop ? (
          <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(slideIndex)}
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

      {loop ? (
        <>
          <button
            type="button"
            onClick={() => step(-1)}
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
            onClick={() => step(1)}
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
