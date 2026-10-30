"use client";

import { useEffect, useRef, useState } from "react";

export type UseDebouncedSearchOptions = {
  value: string;
  onSearch: (value: string) => void;
  delay?: number;
};

export type UseDebouncedSearchResult = {
  input: string;
  setInput: (value: string) => void;
  pending: boolean;
  /** Runs the pending search now; used by Enter. Safe when nothing is pending. */
  flush: () => void;
};

/**
 * Local search text with a debounced callback. The input owns its value while
 * the user types, so the field keeps focus when results re-render around it.
 */
export function useDebouncedSearch({
  value,
  onSearch,
  delay = 300,
}: UseDebouncedSearchOptions): UseDebouncedSearchResult {
  const [input, setInputState] = useState(value);
  const [pending, setPending] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Same reason as the header search: the debounce fires from a timer, where
  // an Effect Event is not allowed, so the latest callback lives in a ref.
  const callback = useRef(onSearch);
  const typing = useRef(false);

  useEffect(() => {
    callback.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, []);

  // Outside updates win unless the user is mid-typing. Once their text reaches
  // the prop they are back in sync, so a later clear or back button can move it.
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

  return { input, setInput, pending, flush };
}
