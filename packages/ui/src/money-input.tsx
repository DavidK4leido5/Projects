"use client";

import { forwardRef, useMemo, useState, type ChangeEvent } from "react";
import { cn } from "@repo/shared";
import { Input } from "./input";

type MoneyInputProps = {
  value: number | null;
  onChange: (minor: number | null) => void;
  currency?: string;
  locale?: string;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  allowNegative?: boolean;
  className?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
  "aria-label"?: string;
};

/** Keep digits, one dot and a leading minus; cap the fraction at two places. */
function sanitize(raw: string, allowNegative: boolean): string {
  const negative = allowNegative && raw.trimStart().startsWith("-");
  let whole = "";
  let fraction = "";
  let seenDot = false;

  for (const char of raw) {
    if (char >= "0" && char <= "9") {
      if (seenDot) {
        if (fraction.length < 2) fraction += char;
      } else {
        whole += char;
      }
    } else if (char === "." && !seenDot) {
      seenDot = true;
    }
  }

  return (negative ? "-" : "") + whole.replace(/^0+(?=\d)/, "") + (seenDot ? "." + fraction : "");
}

/** Digit math, not parseFloat: 12.34 reads as 12 * 100 + 34. */
function toMinor(text: string): number | null {
  if (!/\d/.test(text)) return null;

  const negative = text.startsWith("-");
  const unsigned = negative ? text.slice(1) : text;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const cents = (fraction + "00").slice(0, 2);
  const minor = Number(whole || "0") * 100 + Number(cents);

  return negative ? -minor : minor;
}

function formatMinor(minor: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(minor / 100);
}

const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  {
    value,
    onChange,
    currency = "PHP",
    locale = "en-PH",
    id,
    name,
    placeholder,
    disabled,
    allowNegative = false,
    className,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
    "aria-label": ariaLabel,
  },
  ref,
) {
  const [draft, setDraft] = useState<string | null>(null);

  const symbol = useMemo(() => {
    const parts = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).formatToParts(0);

    return parts.find((part) => part.type === "currency")?.value ?? currency;
  }, [currency, locale]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const next = sanitize(event.target.value, allowNegative);
    setDraft(next);
    onChange(toMinor(next));
  }

  function handleFocus() {
    setDraft(value === null ? "" : formatMinor(value, locale));
  }

  function handleBlur() {
    const minor = toMinor(draft ?? "");
    setDraft(null);
    if (minor !== value) onChange(minor);
  }

  const display = draft ?? (value === null ? "" : formatMinor(value, locale));

  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
      >
        {symbol}
      </span>
      <Input
        ref={ref}
        id={id}
        name={name}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder={placeholder}
        disabled={disabled}
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        aria-label={ariaLabel ?? (id ? undefined : currency + " amount")}
        className="pl-8 tabular-nums"
      />
    </div>
  );
});

export { MoneyInput, type MoneyInputProps };
