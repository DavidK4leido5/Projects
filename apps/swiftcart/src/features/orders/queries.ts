import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { addresses, orderItems, orders } from "@/lib/db/schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function listUserOrders(userId: string) {
  const rows = await getDb()
    .select({
      id: orders.id,
      accessToken: orders.accessToken,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  return rows;
}

/**
 * Reads one order by its access token. The token is the capability: it is a
 * random uuid, so a guest can open the order without an account.
 */
export async function getOrderByToken(token: string) {
  // Postgres rejects a non-uuid against a uuid column, so filter it out here.
  if (!UUID.test(token)) return null;

  const header = await getDb().select().from(orders).where(eq(orders.accessToken, token)).limit(1);
  const order = header[0];
  if (!order) return null;

  const items = await getDb().select().from(orderItems).where(eq(orderItems.orderId, order.id));

  return { order, items };
}

/** The saved delivery details for a signed-in shopper, if any. */
export async function getSavedAddress(profileId: string) {
  const rows = await getDb()
    .select({
      fullName: addresses.fullName,
      phone: addresses.phone,
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      region: addresses.region,
      postal: addresses.postal,
      country: addresses.country,
    })
    .from(addresses)
    .where(eq(addresses.profileId, profileId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listAllOrders() {
  return getDb()
    .select({
      id: orders.id,
      accessToken: orders.accessToken,
      status: orders.status,
      totalCents: orders.totalCents,
      customerEmail: orders.customerEmail,
      customerName: orders.customerName,
      userId: orders.userId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt));
}
