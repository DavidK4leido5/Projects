import {
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  Smartphone,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AccountType } from "@repo/db/schema";

export const ACCOUNT_TYPE_META: Record<AccountType, { label: string; icon: LucideIcon }> = {
  cash: { label: "Cash", icon: Banknote },
  bank: { label: "Bank", icon: Landmark },
  ewallet: { label: "E-wallet", icon: Smartphone },
  credit_card: { label: "Credit card", icon: CreditCard },
  savings: { label: "Savings", icon: PiggyBank },
  investment: { label: "Investment", icon: TrendingUp },
};

export const ACCOUNT_ICONS: Record<string, LucideIcon> = {
  wallet: Wallet,
  banknote: Banknote,
  landmark: Landmark,
  smartphone: Smartphone,
  "credit-card": CreditCard,
  "piggy-bank": PiggyBank,
  "trending-up": TrendingUp,
};

export const ACCOUNT_TYPES: AccountType[] = [
  "cash",
  "bank",
  "ewallet",
  "credit_card",
  "savings",
  "investment",
];
