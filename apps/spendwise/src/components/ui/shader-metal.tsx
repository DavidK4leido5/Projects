"use client";

import { useRef } from "react";
import { cn } from "@repo/shared";
import { useShaderMetal } from "@/lib/hooks";
import {
  DEFAULT_IRIDESCENCE,
  DEFAULT_METAL,
  DEFAULT_RIBBONS,
  DEFAULT_SPEED,
  type ShaderMetalProps,
} from "@/lib/shader-metal";

export type {
  ShaderMetalInstance,
  ShaderMetalMetal,
  ShaderMetalOptions,
  ShaderMetalProps,
  ShaderMetalTheme,
} from "@/lib/shader-metal";

export {
  DEFAULT_IRIDESCENCE,
  DEFAULT_METAL,
  DEFAULT_RIBBONS,
  DEFAULT_SPEED,
  METALS,
  createShaderMetal,
  isDarkTheme,
  resolveDark,
} from "@/lib/shader-metal";

/**
 * Liquid metal ribbons twisting through a studio light rig: brushed,
 * curved strips with soft shadows on a transparent canvas. Theme-aware.
 *
 * The WebGL engine lives in `src/lib/shader-metal.ts` and the lifecycle in
 * `src/lib/hooks.ts` so the component stays presentational.
 */
export function ShaderMetal({
  className,
  metal = DEFAULT_METAL,
  color,
  ribbons = DEFAULT_RIBBONS,
  speed = DEFAULT_SPEED,
  iridescence = DEFAULT_IRIDESCENCE,
  interactive = true,
  theme = "auto",
}: ShaderMetalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useShaderMetal(canvasRef, {
    metal,
    color,
    ribbons,
    speed,
    iridescence,
    interactive,
    theme,
  });

  return (
    <div
      data-slot="shader-metal"
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] [mask-image:linear-gradient(#000,#000)]",
        className,
      )}
    >
      {/* Firefox can hand a WebGL canvas straight to the system compositor,
          which ignores rounded clips. The mask on the root keeps it in the
          page's own layer, so the parent's radius holds. */}
      <canvas ref={canvasRef} className="absolute inset-0 size-full rounded-[inherit]" />
    </div>
  );
}
