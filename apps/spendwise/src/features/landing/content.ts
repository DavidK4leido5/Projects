import { brand } from "@/lib/brand";

export const site = {
  name: brand.name,
  tagline: brand.tagline,
  description: brand.description,
  domain: brand.domain,
} as const;

export type IconKey =
  | "transactions"
  | "cashflow"
  | "budgets"
  | "goals"
  | "recurring"
  | "accounts"
  | "insights"
  | "reports"
  | "csv"
  | "shield"
  | "download"
  | "devices"
  | "lock"
  | "wallet"
  | "receipt"
  | "check"
  | "database";

export const nav = {
  links: [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "Reports", href: "#reports" },
    { label: "FAQ", href: "#faq" },
  ],
  login: { label: "Log in", href: "/login" },
  signup: { label: "Get started", href: "/signup" },
  dashboard: { label: "Go to dashboard", href: "/dashboard" },
  signedInLabel: "You are signed in",
  menuLabel: "Open menu",
} as const;

export const hero = {
  headline: brand.tagline,
  headlineOptions: [brand.tagline, ...brand.alternateTaglines],
  subheadline:
    "Dalorro turns everyday entries into a calm view of your cash flow, budgets, goals, and savings, with clear reports when you need them. Email and password only, no bank connections.",
  primaryCta: { label: "Get started free", href: "/signup" },
  secondaryCta: { label: "See how it works", href: "#tour" },
  reassurance: "Free to start. Email and password only. No credit card.",
} as const;

export const trust = [
  {
    icon: "lock" as IconKey,
    title: "Private by default",
    detail: "Every record is scoped to your account.",
  },
  {
    icon: "download" as IconKey,
    title: "Export anytime",
    detail: "Take everything out as JSON or CSV.",
  },
  {
    icon: "devices" as IconKey,
    title: "Works on any device",
    detail: "A responsive web app you can install.",
  },
  {
    icon: "shield" as IconKey,
    title: "No bank access",
    detail: "You stay in control of every entry.",
  },
] as const;

export const features = [
  {
    id: "transactions",
    icon: "transactions" as IconKey,
    title: "Transaction tracking",
    description:
      "Record income, expenses, and transfers with payee, notes, tags, and a receipt. Search, filter, edit, and bulk-edit the whole history.",
    span: "wide" as const,
  },
  {
    id: "budgets",
    icon: "budgets" as IconKey,
    title: "Budgets with states",
    description: "Set monthly limits by category and see what is on track, close, or over.",
    span: "normal" as const,
  },
  {
    id: "cashflow",
    icon: "cashflow" as IconKey,
    title: "Cash flow analysis",
    description:
      "See income, spending, net, and savings rate across any period. Transfers never count as either.",
    span: "wide" as const,
  },
  {
    id: "goals",
    icon: "goals" as IconKey,
    title: "Savings goals",
    description: "Give savings a target date, add contributions, and see the pace.",
    span: "normal" as const,
  },
  {
    id: "recurring",
    icon: "recurring" as IconKey,
    title: "Recurring bills",
    description: "Keep upcoming bills in view and record them when they are paid.",
    span: "normal" as const,
  },
  {
    id: "accounts",
    icon: "accounts" as IconKey,
    title: "Accounts and net worth",
    description: "Cash, bank, e-wallet, card, savings, and investments in one balance.",
    span: "normal" as const,
  },
  {
    id: "insights",
    icon: "insights" as IconKey,
    title: "Useful observations",
    description: "Plain-language notes from your own numbers. Rules, not guesses.",
    span: "normal" as const,
  },
  {
    id: "reports",
    icon: "reports" as IconKey,
    title: "PDF reports",
    description:
      "Six report types, A4 or Letter, with charts, category tables, and optional transaction detail.",
    span: "wide" as const,
  },
  {
    id: "csv",
    icon: "csv" as IconKey,
    title: "CSV import and export",
    description: "Bring in a bank export, or take any filtered list out as CSV.",
    span: "normal" as const,
  },
] as const;

export const steps = [
  {
    number: "01",
    title: "Add your accounts",
    description:
      "Start with cash, a bank account, or an e-wallet. Enter the balance you have today.",
    icon: "wallet" as IconKey,
  },
  {
    number: "02",
    title: "Record the everyday",
    description:
      "Add transactions as they happen, or import a CSV from your bank. Transfers stay separate from spending.",
    icon: "transactions" as IconKey,
  },
  {
    number: "03",
    title: "Review and report",
    description:
      "Check your cash flow and budgets, then export a PDF for your records or a conversation.",
    icon: "reports" as IconKey,
  },
] as const;

export const tour = {
  title: "A closer look",
  description:
    "The same screens you will use, filled with a sample six-month history. Switch tabs to see how each part fits.",
  tabs: [
    {
      id: "dashboard",
      label: "Dashboard",
      caption: "One view of balances, cash flow, budgets, goals, savings, and the bills coming up.",
    },
    {
      id: "transactions",
      label: "Transactions",
      caption:
        "Search and filter every entry. Edit one, change a category in bulk, or import a CSV.",
    },
    {
      id: "cash-flow",
      label: "Cash flow",
      caption:
        "Income, expenses, and savings rate across six months, with the current month in focus.",
    },
    {
      id: "budgets",
      label: "Budgets",
      caption: "Monthly limits by category, with on-track, near-limit, and exceeded states.",
    },
    {
      id: "reports",
      label: "Reports",
      caption:
        "Pick a period and sections, preview the PDF, then download it or export the same data as CSV.",
    },
  ],
} as const;

export const reportShowcase = {
  title: "A report you can hand to someone.",
  description:
    "Choose a period and the sections that matter. Dalorro builds the PDF on the server with your currency, locale, and report logo.",
  types: [
    "Monthly Summary",
    "Custom Range",
    "Category Spending",
    "Cash Flow Statement",
    "Budget Performance",
    "Annual Summary",
  ],
  options: [
    "A4 or Letter",
    "Include charts",
    "Include transaction detail",
    "Filter by account or category",
    "Matching CSV export",
    "Saved to report history",
  ],
  note: "Reports are generated on demand and saved to your history, so you can regenerate one later.",
} as const;

export const security = {
  title: "Your records stay yours.",
  points: [
    {
      icon: "lock" as IconKey,
      title: "Passwords handled by Neon Auth",
      detail:
        "Passwords are hashed by the auth service and sessions use HTTP-only cookies. Dalorro never stores a password.",
    },
    {
      icon: "database" as IconKey,
      title: "Every query is scoped",
      detail:
        "Each read and write is filtered by your user id. No screen can load another account's records.",
    },
    {
      icon: "download" as IconKey,
      title: "Your data leaves with you",
      detail:
        "Export everything as JSON, export filtered transactions as CSV, and take report data with you.",
    },
    {
      icon: "shield" as IconKey,
      title: "Delete your financial data",
      detail:
        "Remove your records and receipt files from Settings. No payment or bank integration is involved.",
    },
  ],
} as const;

export const faqs = [
  {
    question: "Is Dalorro free?",
    answer:
      "You can create an account and use the app free. There is no paid plan yet, and no credit card is required to start.",
  },
  {
    question: "What does Dalorro mean?",
    answer:
      "Dalorro joins Daloy, the Tagalog word for flow, and Ahorro, the Spanish word for savings. The app is built around both ideas: money that moves, and money you keep.",
  },
  {
    question: "Which currencies are supported?",
    answer:
      "PHP, USD, EUR, GBP, JPY, AUD, CAD, SGD, INR, and AED. You choose your preferred currency in Settings. Each account can carry its own currency code.",
  },
  {
    question: "Can I import from my bank?",
    answer:
      "Yes, by uploading a CSV exported from your bank. Dalorro does not connect to banks or payment providers directly.",
  },
  {
    question: "How do reports work?",
    answer:
      "Pick a report type and date range, then choose accounts, categories, charts, transaction detail, and A4 or Letter. The PDF is generated on the server, previewed in the browser, and saved to your report history.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Yes. Filtered transactions export to CSV, report data exports to CSV, and Settings exports every record as JSON.",
  },
  {
    question: "Is my data private?",
    answer:
      "Your records are scoped to your account and are not shared. Dalorro has no bank connections, advertising scripts, or payment integrations.",
  },
  {
    question: "Does it work on mobile?",
    answer:
      "Yes. The app has a bottom tab bar on small screens and can be installed as a progressive web app. It works from 360px wide.",
  },
  {
    question: "How do I delete my account?",
    answer:
      "Settings has a delete account option. It removes your financial records and receipt files after confirming your password, then signs you out.",
  },
] as const;

export const finalCta = {
  title: "Start with one account. Watch the flow take shape.",
  description:
    "Add an entry, set a budget, name a savings goal. Your cash flow and reports build from there.",
  cta: { label: "Get started free", href: "/signup" },
  reassurance: "Free to start. Email and password only. No credit card.",
} as const;

export const footer = {
  tagline: "A personal record book for cash flow, budgets, savings, and reports.",
  columns: [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "How it works", href: "#how-it-works" },
        { label: "Reports", href: "#reports" },
        { label: "FAQ", href: "#faq" },
      ],
    },
    {
      title: "Account",
      links: [
        { label: "Log in", href: "/login" },
        { label: "Create account", href: "/signup" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy", href: "/privacy" },
        { label: "Terms", href: "/terms" },
      ],
    },
  ],
  note: "Built as a personal record book, not a bank.",
} as const;
