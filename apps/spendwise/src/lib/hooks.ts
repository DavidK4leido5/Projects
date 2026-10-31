"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from "react";

const emptySubscribe = () => () => {};

/** Settles on a value only after it has stopped changing for `delay` ms. */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

/** True after hydration, without an effect-driven second render. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/** Tailwind's md breakpoint, synced straight from matchMedia. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener("change", onChange);
      return () => media.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/**
 * Object URL for a freshly picked file. The URL is revoked when it is replaced
 * or the component unmounts, so previews never leak blob memory.
 */
export function useObjectUrl(): [string | null, (file: File | null) => void] {
  const [url, setUrl] = useState<string | null>(null);
  const active = useRef<string | null>(null);

  const select = useCallback((file: File | null) => {
    if (active.current) URL.revokeObjectURL(active.current);
    active.current = file ? URL.createObjectURL(file) : null;
    setUrl(active.current);
  }, []);

  useEffect(() => {
    return () => {
      if (active.current) URL.revokeObjectURL(active.current);
      active.current = null;
    };
  }, []);

  return [url, select];
}

/** Calls back on a bare key press unless the user is typing in a field. */
export function useKeyboardShortcut(key: string, onTrigger: () => void): void {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (event.key.toLowerCase() === key.toLowerCase()) {
        event.preventDefault();
        onTrigger();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, onTrigger]);
}

/**
 * Opens when a URL flag is present (for example ?new=1). Closing removes the
 * flag, so a refresh does not reopen the dialog. No effect needed: the URL is
 * the source of truth.
 */
export function useOpenFromParam(param: string): [boolean, (open: boolean) => void] {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [manualOpen, setManualOpen] = useState(false);
  const fromUrl = params.get(param) === "1";

  const setOpen = useCallback(
    (next: boolean) => {
      setManualOpen(next);
      if (!next && fromUrl) {
        const query = new URLSearchParams(params.toString());
        query.delete(param);
        const rest = query.toString();
        router.replace(rest ? pathname + "?" + rest : pathname, { scroll: false });
      }
    },
    [fromUrl, param, params, pathname, router],
  );

  return [manualOpen || fromUrl, setOpen];
}
/** Registers the offline shell once in production. */
export function useServiceWorker(): void {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);
}
let unreadCount: number | null = null;
const unreadListeners = new Set<() => void>();

/** Shared optimistic unread count for the header bell and the inbox. */
export function setNotificationUnread(count: number): void {
  unreadCount = Math.max(0, count);
  for (const listener of unreadListeners) listener();
}

export function incrementNotificationUnread(): void {
  if (unreadCount === null) return;
  setNotificationUnread(unreadCount + 1);
}

export function useNotificationUnread(initial: number): number {
  const value = useSyncExternalStore(
    (listener) => {
      unreadListeners.add(listener);
      return () => unreadListeners.delete(listener);
    },
    () => unreadCount ?? initial,
    () => initial,
  );

  useEffect(() => {
    // Initialize once. After an optimistic clear, remounting the header must
    // not resurrect the stale server count from a cached RSC payload.
    if (unreadCount === null) setNotificationUnread(initial);
  }, [initial]);

  return value;
}
/** Subscribes to one named SSE event and keeps the latest handler. */
export function useServerSentEvent<T>(
  url: string,
  eventName: string,
  onEvent: (data: T) => void,
): void {
  const latest = useRef(onEvent);

  useEffect(() => {
    latest.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (typeof EventSource === "undefined") return;
    const source = new EventSource(url);
    const handler = (event: MessageEvent) => {
      try {
        latest.current(JSON.parse(event.data) as T);
      } catch {
        // ignore malformed frames
      }
    };
    source.addEventListener(eventName, handler);
    return () => {
      source.removeEventListener(eventName, handler);
      source.close();
    };
  }, [url, eventName]);
}

export type GlassFoldOptions = {
  /** Two hex tints blended across the fold: [teal, gold]. */
  colors: readonly [string, string];
  /** Animation speed multiplier. */
  speed?: number;
};

const GLASS_FOLD_VERTEX = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const GLASS_FOLD_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_teal;
uniform vec3 u_gold;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / u_resolution.y;

  float drift = u_time * 0.045;
  float warp = noise(uv * 1.7 + vec2(drift, -drift * 0.6)) * 0.65
             + noise(uv * 3.4 - vec2(drift * 0.5, drift)) * 0.35;

  // Two soft panes meeting at a crease, like a folded sheet of glass.
  float fold = sin(uv.x * 2.0 + uv.y * 1.2 + warp * 3.4 + u_time * 0.09);
  float pane = 0.5 + 0.5 * fold;
  float crease = smoothstep(0.55, 0.98, abs(fold));

  vec3 tint = mix(u_teal, u_gold, smoothstep(0.2, 0.8, pane));

  // Stay quiet behind the headline and fade out at the edges.
  float quiet = smoothstep(0.02, 0.45, abs(uv.y) + abs(uv.x) * 0.1);
  float vignette = smoothstep(1.3, 0.25, length(uv * vec2(0.65, 1.3)));
  float alpha = (pane * 0.16 + crease * 0.5) * quiet * vignette;

  gl_FragColor = vec4(tint, clamp(alpha, 0.0, 1.0));
}
`;

/** A pose that still reads as glass when the fold cannot move. */
const GLASS_FOLD_STILL_TIME = 7;

function hexToRgb(hex: string): [number, number, number] {
  const digits = hex.replace("#", "");
  const value = Number.parseInt(digits.length === 3 ? digits.replace(/./g, "$&$&") : digits, 16);
  if (!Number.isFinite(value)) return [0, 0, 0];
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
  return null;
}

/**
 * Paints the hero's folded-glass backdrop on a canvas. The hook owns the whole
 * WebGL lifecycle so the component stays a ref plus markup. A browser without
 * WebGL keeps the canvas transparent.
 *
 * The loop stops when the canvas leaves the viewport, when the document is
 * hidden, and when the user asks for reduced motion (one still frame instead).
 */
export function useGlassFold(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  { colors, speed = 1 }: GlassFoldOptions,
): void {
  const [tealHex, goldHex] = colors;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
      stencil: false,
    });
    if (!gl) return;

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, GLASS_FOLD_VERTEX);
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, GLASS_FOLD_FRAGMENT);
    const program = vertexShader && fragmentShader ? gl.createProgram() : null;
    if (!vertexShader || !fragmentShader || !program) return;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(gl.getUniformLocation(program, "u_teal"), hexToRgb(tealHex));
    gl.uniform3fv(gl.getUniformLocation(program, "u_gold"), hexToRgb(goldHex));
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    const resolution = gl.getUniformLocation(program, "u_resolution");
    const time = gl.getUniformLocation(program, "u_time");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let elapsed = 0;
    let last = 0;
    let visible = true;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, width, height);
      gl.uniform2f(resolution, width, height);
    };

    const draw = (at: number) => {
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(time, at);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (document.hidden || !visible) {
        last = now;
        return;
      }
      elapsed += Math.min((now - last) / 1000, 0.05) * speed;
      last = now;
      draw(elapsed);
    };

    const sync = () => {
      if (reduceMotion.matches) {
        stop();
        draw(GLASS_FOLD_STILL_TIME);
        return;
      }
      if (!visible || document.hidden) {
        stop();
        return;
      }
      if (!frame) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      visible = entry.isIntersecting;
      sync();
    });
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (reduceMotion.matches) draw(GLASS_FOLD_STILL_TIME);
    });
    const onContextLost = (event: Event) => {
      event.preventDefault();
      stop();
    };

    resize();
    sync();
    observer.observe(canvas);
    resizeObserver.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    reduceMotion.addEventListener("change", sync);
    canvas.addEventListener("webglcontextlost", onContextLost);

    return () => {
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", sync);
      reduceMotion.removeEventListener("change", sync);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
    };
  }, [canvasRef, tealHex, goldHex, speed]);
}
