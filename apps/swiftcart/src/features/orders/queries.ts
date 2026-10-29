import "server-only";

import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { orderItems, orders } from "@/lib/db/schema";

export async function listUserOrders(userId: string) {
  const rows = await getDb()
    .select({
      id: orders.id,
      status: orders.status,
      totalCents: orders.totalCents,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .where(eq(orders.userId, userId))
    .orderBy(desc(orders.createdAt));

  return rows;
}

export async function getOrder(orderId: string) {
  const header = await getDb().select().from(orders).where(eq(orders.id, orderId)).limit(1);
  const order = header[0];
  if (!order) return null;

  const items = await getDb().select().from(orderItems).where(eq(orderItems.orderId, orderId));

  return { order, items };
}

export async function listAllOrders() {
  return getDb()
    .select({
      id: orders.id,
      status: orders.status,
      totalCents: orders.totalCents,
      customerEmail: orders.customerEmail,
      userId: orders.userId,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .orderBy(desc(orders.createdAt));
}
