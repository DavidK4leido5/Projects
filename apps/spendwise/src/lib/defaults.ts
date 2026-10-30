import type { AccountType, CategoryKind, PaymentMethod } from "@repo/db/schema";

export type DefaultCategory = {
  name: string;
  kind: CategoryKind;
  color: string;
  icon: string;
};

/** Ordered so the category picker reads like a budget, not a database dump. */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Food", kind: "expense", color: "amber", icon: "utensils" },
  { name: "Transport", kind: "expense", color: "sky", icon: "bus" },
  { name: "Housing", kind: "expense", color: "indigo", icon: "house" },
  { name: "Utilities", kind: "expense", color: "teal", icon: "plug" },
  { name: "Health", kind: "expense", color: "rose", icon: "heart-pulse" },
  { name: "Entertainment", kind: "expense", color: "violet", icon: "clapperboard" },
  { name: "Shopping", kind: "expense", color: "orange", icon: "shopping-bag" },
  { name: "Education", kind: "expense", color: "emerald", icon: "graduation-cap" },
  { name: "Personal", kind: "expense", color: "slate", icon: "user" },
  { name: "Savings", kind: "expense", color: "emerald", icon: "piggy-bank" },
  { name: "Salary", kind: "income", color: "emerald", icon: "banknote" },
  { name: "Freelance", kind: "income", color: "teal", icon: "laptop" },
  { name: "Business", kind: "income", color: "sky", icon: "store" },
  { name: "Gifts", kind: "income", color: "rose", icon: "gift" },
  { name: "Other Income", kind: "income", color: "slate", icon: "plus-circle" },
];

export const DEFAULT_ACCOUNTS: {
  name: string;
  type: AccountType;
  color: string;
  icon: string;
  startingBalance: number;
}[] = [
  { name: "Cash", type: "cash", color: "amber", icon: "wallet", startingBalance: 0 },
  { name: "Bank", type: "bank", color: "sky", icon: "landmark", startingBalance: 0 },
  { name: "E-wallet", type: "ewallet", color: "teal", icon: "smartphone", startingBalance: 0 },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "debit_card", label: "Debit card" },
  { value: "credit_card", label: "Credit card" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "ewallet", label: "E-wallet" },
  { value: "other", label: "Other" },
];
