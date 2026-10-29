import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Identity lives in Neon Auth (hosted Better Auth). This table is our app-side
 * projection of it: the role and display name we authorize against, keyed by the
 * auth user id. The hosted service has no place to store app roles.
 */
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    role: text("role").notNull().default("user"),
    fullName: text("full_name"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("profiles_email_idx").on(table.email)],
);

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    tagline: text("tagline").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stores_slug_idx").on(table.slug),
    uniqueIndex("stores_owner_idx").on(table.ownerId),
  ],
);

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    priceCents: integer("price_cents").notNull(),
    stock: integer("stock").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    properties: jsonb("properties").$type<ProductProperty[]>().notNull().default([]),
    bannerWideKey: text("banner_wide_key"),
    bannerTallKey: text("banner_tall_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("products_slug_idx").on(table.slug),
    index("products_store_idx").on(table.storeId),
  ],
);

export type ProductProperty = { name: string; values: string[] };

export type VariantOptions = Record<string, string>;

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    options: jsonb("options").$type<VariantOptions>().notNull().default({}),
    priceCents: integer("price_cents"),
    stock: integer("stock").notNull().default(0),
    sku: text("sku"),
    imageKey: text("image_key"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("product_variants_product_idx").on(table.productId)],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("product_images_position_idx").on(table.productId, table.position),
    index("product_images_product_idx").on(table.productId),
  ],
);

export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("carts_user_idx").on(table.userId)],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cart_items_cart_variant_idx").on(table.cartId, table.variantId),
    index("cart_items_cart_idx").on(table.cartId),
  ],
);

export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: text("profile_id")
    .notNull()
    .unique()
    .references(() => profiles.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  line1: text("line1").notNull(),
  line2: text("line2"),
  city: text("city").notNull(),
  region: text("region"),
  postal: text("postal").notNull(),
  country: text("country").notNull().default("PH"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The identity can go away; the order and its money must not.
    userId: text("user_id").references(() => profiles.id, { onDelete: "set null" }),
    customerEmail: text("customer_email"),
    customerName: text("customer_name"),
    customerPhone: text("customer_phone"),
    deliveryLine1: text("delivery_line1"),
    deliveryLine2: text("delivery_line2"),
    deliveryCity: text("delivery_city"),
    deliveryRegion: text("delivery_region"),
    deliveryPostal: text("delivery_postal"),
    deliveryCountry: text("delivery_country"),
    accessToken: uuid("access_token").notNull().defaultRandom().unique(),
    status: text("status").notNull().default("placed"),
    totalCents: integer("total_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("orders_user_idx").on(table.userId),
    index("orders_created_idx").on(table.createdAt),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    // Snapshots: renaming or deleting a product must not rewrite history.
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "set null" }),
    optionSummary: text("option_summary"),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    storeId: uuid("store_id").references(() => stores.id, { onDelete: "set null" }),
    productName: text("product_name").notNull(),
    storeName: text("store_name").notNull(),
    priceCents: integer("price_cents").notNull(),
    quantity: integer("quantity").notNull(),
  },
  (table) => [index("order_items_order_idx").on(table.orderId)],
);

export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Store = typeof stores.$inferSelect;
export type Product = typeof products.$inferSelect;
export type ProductImage = typeof productImages.$inferSelect;
export type ProductVariant = typeof productVariants.$inferSelect;
export type CartItem = typeof cartItems.$inferSelect;
export type Role = "admin" | "store" | "user";
