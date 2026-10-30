/**
 * Tag contract. Every cached read declares one of these, and every write
 * revalidates the ones it actually changes. A string literal at the call site
 * would drift; this is the list.
 */
export const tags = {
  products: "products",
  product: (slug: string) => "product:" + slug,
  stores: "stores",
  store: (slug: string) => "store:" + slug,
  featured: "featured",
  orders: "orders",
  order: (id: string) => "order:" + id,
  users: "users",
  user: (id: string) => "user:" + id,
  inventory: (storeId: string) => "inventory:" + storeId,
} as const;

/** Lifetimes, in the vocabulary Next understands. */
export const lifetimes = {
  catalogue: "minutes",
  detail: "hours",
  static: "days",
} as const;
