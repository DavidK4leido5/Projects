"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { endPending } from "@/lib/navigation-pending";

/** A ref that always holds the latest value, without re-subscribing listeners. */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

/**
 * A media query as state. The browser owns the answer, so this subscribes to it
 * instead of mirroring it into state from an effect. The server snapshot is
 * always false: the narrow layout is the safe default before hydration.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

type ListenerOptions = {
  enabled?: boolean;
  capture?: boolean;
  passive?: boolean;
};

/**
 * One place that adds and removes a listener. The target is read inside the
 * effect, so a ref that fills in after mount still attaches.
 */
export function useEventListener(
  getTarget: () => EventTarget | null,
  type: string,
  handler: (event: never) => void,
  { enabled = true, capture, passive }: ListenerOptions = {},
): void {
  const latest = useLatest(handler);

  useEffect(() => {
    if (!enabled) return;
    const target = getTarget();
    if (!target) return;
    const listener = (event: Event) => {
      (latest.current as (value: Event) => void)(event);
    };
    target.addEventListener(type, listener, { capture, passive });
    return () => target.removeEventListener(type, listener, { capture });
    // getTarget is a stable inline closure by contract; the caller's deps are
    // expressed through enabled and type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, enabled, capture, passive, latest]);
}

/** Runs the callback every `delay` ms while the delay is a number. */
export function useInterval(callback: () => void, delay: number | null): void {
  const latest = useLatest(callback);

  useEffect(() => {
    if (delay === null) return;
    const timer = window.setInterval(() => latest.current(), delay);
    return () => window.clearInterval(timer);
  }, [delay, latest]);
}

/** Restores the previous body overflow when the overlay closes or unmounts. */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/**
 * The distance from the top of the document to the element, kept current across
 * resizes and layout shifts. Null until the first measurement.
 */
export function useElementOffsetTop(ref: RefObject<HTMLElement | null>): number | null {
  const [offset, setOffset] = useState<number | null>(null);

  useEffect(() => {
    const measure = () => {
      const next = ref.current?.offsetTop ?? null;
      setOffset((current) => (current === next ? current : next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [ref]);

  return offset;
}

/**
 * Fires when the row index enters the last `threshold` rows. Used by the
 * catalogue feed, where the virtualiser already knows which rows are mounted.
 */
export function useNearEnd(
  index: number,
  count: number,
  threshold: number,
  onNearEnd: () => void,
): void {
  const latest = useLatest(onNearEnd);

  useEffect(() => {
    if (count === 0 || index < count - threshold) return;
    // Deferred a tick: the virtualiser triggers this from its own render pass.
    queueMicrotask(() => latest.current());
  }, [index, count, threshold, latest]);
}

/** Runs `onCommit` when `key` changes, skipping the first render. */
export function useUrlCommit(key: string, onCommit: () => void): void {
  const previous = useRef(key);
  const latest = useLatest(onCommit);

  useEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    latest.current();
  }, [key, latest]);
}

/** Drops the pending flag once the URL a navigation asked for is in use. */
export function useSettlePending(key: string): void {
  useEffect(() => {
    endPending();
  }, [key]);
}

/**
 * Local text for a URL-backed search field. Typing owns the value, the debounce
 * commits it, and outside changes (back, clear, a link) win unless the user is
 * mid-word. One implementation, used by the header search and table toolbars.
 */
export function useDebouncedSearchField({
  value,
  onCommit,
  delay = 300,
}: {
  value: string;
  onCommit: (value: string) => void;
  delay?: number;
}): {
  input: string;
  setInput: (value: string) => void;
  flush: () => void;
  pending: boolean;
} {
  const [input, setInputState] = useState(value);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callback = useLatest(onCommit);
  const typing = useRef(false);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  useEffect(() => {
    if (typing.current) {
      if (value === input) typing.current = false;
      return;
    }
    setInputState(value);
  }, [value, input]);

  function setInput(next: string) {
    typing.current = true;
    setInputState(next);
    setPending(true);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      setPending(false);
      callback.current(next);
    }, delay);
  }

  function flush() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setPending(false);
    callback.current(input);
  }

  return { input, setInput, flush, pending };
}
