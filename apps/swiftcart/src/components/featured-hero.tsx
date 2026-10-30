"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Carousel, CarouselContent, CarouselItem, useCarousel } from "@repo/ui";
import { useCarouselIndex, useEventListener, useInterval, useMediaQuery } from "@/lib/hooks";

export type HeroSlide = {
  id: string;
  slug: string;
  name: string;
  wideSrcSet?: string;
  tallSrc: string;
  tallSrcSet?: string;
};

const INTERVAL_MS = 5500;

/**
 * Full-bleed banner. Embla owns the track (drag, swipe, loop, snap); this file
 * only supplies the chrome, because the arrows and dots are this hero's design
 * rather than shadcn's default buttons.
 */
export function FeaturedHero({ slides }: { slides: HeroSlide[] }) {
  const [paused, setPaused] = useState(false);
  const gesture = useRef<{ x: number; y: number } | null>(null);

  // A swipe that ends on a banner must not follow that banner's link. Embla
  // moves the track, but the browser still delivers a click to whatever is
  // under the pointer, so the gesture decides whether the click counts.
  function onClickCapture(event: React.MouseEvent) {
    const start = gesture.current;
    gesture.current = null;
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 10) return;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Featured products"
      className="relative touch-pan-y overflow-hidden bg-neutral-950 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onPointerDown={(event) => {
        setPaused(true);
        gesture.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
      onClickCapture={onClickCapture}
    >
      {/*
        Full bleed. The desktop frame is ~2.5:1 through the usual desktop widths,
        which is why the required banner is 5:2 rather than 16:9: the artwork is
        authored for the band instead of being cropped into it.
      */}
      <div className="relative aspect-[9/16] w-full overflow-hidden sm:aspect-[3168/1344]">
        <Carousel
          opts={{ loop: slides.length > 1, align: "start", duration: 25 }}
          className="h-full cursor-grab active:cursor-grabbing"
        >
          <CarouselContent>
            {slides.map((slide) => (
              <CarouselItem key={slide.id} className="relative h-full">
                <Link
                  href={"/products/" + slide.slug}
                  aria-label={slide.name}
                  draggable={false}
                  className="block h-full w-full"
                >
                  <picture>
                    <source media="(min-width: 640px)" srcSet={slide.wideSrcSet} sizes="100vw" />
                    <img
                      src={slide.tallSrc}
                      srcSet={slide.tallSrcSet}
                      sizes="100vw"
                      alt={slide.name}
                      draggable={false}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  </picture>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>

          <HeroChrome slides={slides} paused={paused} />
        </Carousel>
      </div>
    </section>
  );
}

function HeroChrome({ slides, paused }: { slides: HeroSlide[]; paused: boolean }) {
  const { api } = useCarousel();
  const active = useCarouselIndex(api);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const loop = slides.length > 1;

  useInterval(() => api?.scrollNext(), loop && !paused && !reducedMotion ? INTERVAL_MS : null);

  useEventListener(
    () => window,
    "keydown",
    (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === "ArrowRight") api?.scrollNext();
      if (key === "ArrowLeft") api?.scrollPrev();
    },
    { enabled: loop },
  );

  if (!loop) return null;

  return (
    <>
      <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
        {slides.map((slide, slideIndex) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => api?.scrollTo(slideIndex)}
            aria-label={"Show " + slide.name}
            aria-current={slideIndex === active}
            className={
              "h-1.5 rounded-full transition-all " +
              (slideIndex === active ? "w-7 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70")
            }
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => api?.scrollPrev()}
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
        onClick={() => api?.scrollNext()}
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
  );
}
