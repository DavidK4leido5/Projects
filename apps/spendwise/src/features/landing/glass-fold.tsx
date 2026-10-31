"use client";

import { useRef } from "react";
import { useTheme } from "next-themes";
import { brand } from "@/lib/brand";
import { useGlassFold } from "@/lib/hooks";

/**
 * Tints mirror the --primary and --gold tokens in globals.css. The shader wants
 * numeric colors while the theme lives in a class, so the pair is picked here.
 */
const tints = {
  light: [brand.colors.light.primary, brand.colors.light.gold],
  dark: [brand.colors.dark.primary, brand.colors.dark.gold],
} as const;

/** Decorative folded-glass backdrop for the hero. Sits behind all hero content. */
export function GlassFold() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { resolvedTheme } = useTheme();

  useGlassFold(canvasRef, { colors: tints[resolvedTheme === "dark" ? "dark" : "light"] });

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 hidden h-[520px] opacity-[0.18] [mask-image:linear-gradient(to_bottom,black,black_55%,transparent)] dark:opacity-[0.24] sm:block"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
