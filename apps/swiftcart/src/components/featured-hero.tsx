"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

export type HeroSlide = {
  id: string;
  slug: string;
  name: string;
  wideSrcSet?: string;
  tallSrc: string;
  tallSrcSet?: string;
};

const INTERVAL_MS = 5500;

export function FeaturedHero({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count]);

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % count),
      INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [count, paused]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowRight") setIndex((current) => (current + 1) % count);
      if (event.key === "ArrowLeft") setIndex((current) => (current - 1 + count) % count);
    }
    if (count > 1) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }
  }, [count]);

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured products"
      className="relative overflow-hidden bg-neutral-950"
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
      <div className="relative aspect-[9/16] w-full overflow-hidden sm:aspect-[3168/1344]">
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
