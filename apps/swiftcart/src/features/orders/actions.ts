"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { updateTag } from "next/cache";
import { getDb } from "@/lib/db";
import {
  addresses,
  cartItems,
  orderEvents,
  orderFulfilments,
  orderItems,
  orders,
  productVariants,
  products,
  profiles,
} from "@/lib/db/schema";
import { getActor, requireAdmin } from "@/lib/auth/guards";
import { getCartId } from "@/lib/cart";
import { getCart } from "@/features/cart/queries";
import { tags } from "@/lib/cache";

export type PlaceOrderResult =
  { ok: true; token: string; ref: string } | { ok: false; error: string };

/** The delivery snapshot an order is created from. */
type Delivery = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal: string;
  country: string;
};

/** "Size: M, Color: Bone" for the order snapshot. */
function summarise(options: Record<string, string>): string | null {
  const entries = Object.entries(options);
  if (entries.length === 0) return null;
  return entries.map(([name, value]) => name + ": " + value).join(", ");
}

function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "").trim();
}

type DeliveryResult = { ok: true; delivery: Delivery } | { ok: false; error: string };

function readDelivery(formData: FormData): DeliveryResult {
  const fullName = field(formData, "fullName");
  if (fullName.length < 2) return { ok: false, error: "Enter your full name." };

  const phone = field(formData, "phone");
  const digits = phone.replace(/\D/g, "").length;
  if (!/^[+\d][\d\s()-]*$/.test(phone) || digits < 7 || digits > 20) {
    return { ok: false, error: "Enter a phone number with 7 to 20 digits." };
  }

  const line1 = field(formData, "line1");
  if (line1.length < 4) return { ok: false, error: "Enter your street address." };

  const city = field(formData, "city");
  if (city.length < 2) return { ok: false, error: "Enter your city." };

  const postal = field(formData, "postal");
  if (postal.length < 3) return { ok: false, error: "Enter your postal code." };

  return {
    ok: true,
    delivery: {
      fullName,
      phone,
      line1,
      line2: field(formData, "line2") || null,
      city,
      region: field(formData, "region") || null,
      postal,
      country: field(formData, "country") || "PH",
    },
  };
}

/**
 * Turns the cart into an order, for guests as well as signed-in shoppers.
 * On success the caller gets the order's access token, which is the only way
 * back into a guest order.
 *
 * Stock is claimed on the variant with a conditional update per row, so two
 * shoppers cannot both take the last unit of one combination. The HTTP driver
 * has no transactions, so a failed claim is compensated by putting the earlier
 * claims back. That leaves a small window where a crash mid-loop under-counts
 * stock, which is survivable; it never oversells.
 */
export async function placeOrder(formData: FormData): Promise<PlaceOrderResult> {
  const cartId = await getCartId();
  const cart = await getCart(cartId);
  if (!cartId || cart.items.length === 0) return { ok: false, error: "Your cart is empty." };

  const actor = await getActor();
  const parsed = readDelivery(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const delivery = parsed.delivery;

  const db = getDb();

  if (actor.kind === "user") {
    await db
      .insert(addresses)
      .values({ profileId: actor.profile.id, ...delivery })
      .onConflictDoUpdate({
        target: addresses.profileId,
        set: { ...delivery, updatedAt: new Date() },
      });

    await db
      .update(profiles)
      .set({ fullName: delivery.fullName, phone: delivery.phone })
      .where(eq(profiles.id, actor.profile.id));
  }

  const claimed: Array<{ variantId: string; quantity: number }> = [];

  for (const item of cart.items) {
    const updated = await db
      .update(productVariants)
      .set({ stock: sql`${productVariants.stock} - ${item.quantity}` })
      .where(and(eq(productVariants.id, item.variantId), gte(productVariants.stock, item.quantity)))
      .returning({ id: productVariants.id });

    if (updated.length === 0) {
      for (const done of claimed) {
        await db
          .update(productVariants)
          .set({ stock: sql`${productVariants.stock} + ${done.quantity}` })
          .where(eq(productVariants.id, done.variantId));
      }
      return {
        ok: false,
        error:
          "Someone took the last of something. Nothing was reserved. Adjust the cart and try again.",
      };
    }

    claimed.push({ variantId: item.variantId, quantity: item.quantity });
  }

  // Products keep a rolled-up stock number for cards and filters.
  for (const item of cart.items) {
    await db
      .update(products)
      .set({ stock: sql`greatest(${products.stock} - ${item.quantity}, 0)` })
      .where(eq(products.id, item.productId));
  }

  const storeByProduct = new Map<string, string>();
  const productRows = await db
    .select({ id: products.id, storeId: products.storeId })
    .from(products);
  for (const row of productRows) storeByProduct.set(row.id, row.storeId);

  const publicRef = "SC-" + randomBytes(4).toString("hex").toUpperCase();

  const inserted = await db
    .insert(orders)
    .values({
      publicRef,
      userId: actor.kind === "anonymous" ? null : actor.profile.id,
      customerEmail: actor.kind === "anonymous" ? null : actor.profile.email,
      customerName: delivery.fullName,
      customerPhone: delivery.phone,
      deliveryLine1: delivery.line1,
      deliveryLine2: delivery.line2,
      deliveryCity: delivery.city,
      deliveryRegion: delivery.region,
      deliveryPostal: delivery.postal,
      deliveryCountry: delivery.country,
      totalCents: cart.totalCents,
    })
    .returning({ id: orders.id, accessToken: orders.accessToken });

  const order = inserted[0];
  if (!order) return { ok: false, error: "Could not create the order. Nothing was reserved." };

  await db.insert(orderItems).values(
    cart.items.map((item) => ({
      orderId: order.id,
      storeId: storeByProduct.get(item.productId) ?? null,
      productId: item.productId,
      variantId: item.variantId,
      optionSummary: summarise(item.variantOptions),
      productName: item.productName,
      storeName: item.storeName,
      priceCents: item.priceCents,
      quantity: item.quantity,
    })),
  );

  const stores = [
    ...new Set(
      cart.items
        .map((item) => storeByProduct.get(item.productId))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  if (stores.length > 0) {
    await db
      .insert(orderFulfilments)
      .values(stores.map((storeId) => ({ orderId: order.id, storeId, status: "processing" })))
      .onConflictDoNothing();

    await db.insert(orderEvents).values(
      stores.map((storeId) => ({
        orderId: order.id,
        storeId,
        actorId: actor.kind === "anonymous" ? null : actor.profile.id,
        actorRole: actor.kind,
        fromStatus: null,
        toStatus: "processing",
        note: "Order placed",
      })),
    );
  }

  await db.delete(cartItems).where(eq(cartItems.cartId, cartId));

  updateTag(tags.orders);
  updateTag(tags.products);
  return { ok: true, token: order.accessToken, ref: publicRef };
}

export async function setOrderStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id) return;
  if (status !== "placed" && status !== "fulfilled" && status !== "cancelled") return;

  await getDb().update(orders).set({ status }).where(eq(orders.id, id));
  updateTag(tags.orders);
  updateTag(tags.order(id));
}
