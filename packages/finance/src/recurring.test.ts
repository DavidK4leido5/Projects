import { describe, expect, it } from "vitest";
import { advanceCursor, nextOccurrence, occurrencesBetween } from "./recurring";

describe("nextOccurrence", () => {
  it("clamps monthly runs to the last day of shorter months", () => {
    const next = nextOccurrence(new Date(2026, 0, 31, 9), "monthly", { dayOfMonth: 31 });
    expect(next.getMonth()).toBe(1);
    expect(next.getDate()).toBe(28);
  });

  it("clamps the other way when the next month is longer", () => {
    const next = nextOccurrence(new Date(2026, 1, 28, 9), "monthly", { dayOfMonth: 31 });
    expect(next.getMonth()).toBe(2);
    expect(next.getDate()).toBe(31);
  });

  it("advances weekly runs to the requested weekday", () => {
    const next = nextOccurrence(new Date(2026, 9, 30, 9), "weekly", { weekday: 1 });
    expect(next.getDay()).toBe(1);
  });

  it("treats custom as every N days", () => {
    const next = nextOccurrence(new Date(2026, 9, 30, 9), "custom", { interval: 3 });
    expect(next.getDate()).toBe(2);
    expect(next.getMonth()).toBe(10);
  });
});

describe("occurrencesBetween", () => {
  it("returns each due run inside the window", () => {
    const runs = occurrencesBetween(
      new Date(2026, 0, 1, 9),
      "monthly",
      1,
      new Date(2026, 0, 1),
      new Date(2026, 2, 31),
    );
    expect(runs).toHaveLength(3);
  });

  it("skips runs before the window", () => {
    const runs = occurrencesBetween(
      new Date(2025, 0, 1, 9),
      "monthly",
      1,
      new Date(2026, 0, 1),
      new Date(2026, 1, 28),
    );
    expect(runs[0]?.getFullYear()).toBe(2026);
    expect(runs).toHaveLength(2);
  });

  it("caps runaway rules", () => {
    const runs = occurrencesBetween(
      new Date(2020, 0, 1),
      "daily",
      1,
      new Date(2020, 0, 1),
      new Date(2030, 0, 1),
    );
    expect(runs).toHaveLength(120);
  });
});

describe("advanceCursor", () => {
  it("moves past now", () => {
    const next = advanceCursor(new Date(2026, 0, 1), "monthly", 1, new Date(2026, 3, 15));
    expect(next.getMonth()).toBe(4);
  });
});
