import { cn } from "@repo/shared";

type AmountType = "income" | "expense" | "transfer";

type AmountTextProps = {
  amount: number;
  currency?: string;
  locale?: string;
  signed?: boolean;
  type?: AmountType;
  className?: string;
  showSymbol?: boolean;
};

const TYPE_CLASS: Record<AmountType, string> = {
  income: "text-positive",
  expense: "text-negative",
  transfer: "text-foreground",
};

function AmountText({
  amount,
  currency = "PHP",
  locale = "en-PH",
  signed = false,
  type,
  className,
  showSymbol = true,
}: AmountTextProps) {
  // Expenses read as a negative movement even though the stored amount is positive.
  const normalized = type === "expense" ? -Math.abs(amount) : amount;
  const formatted = new Intl.NumberFormat(locale, {
    style: showSymbol ? "currency" : "decimal",
    currency,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? "always" : "auto",
  }).format(normalized / 100);

  return (
    <span className={cn("tabular-nums", type ? TYPE_CLASS[type] : undefined, className)}>
      {formatted}
      {type ? <span className="sr-only">{" (" + type + ")"}</span> : null}
    </span>
  );
}

export { AmountText, type AmountTextProps, type AmountType };
