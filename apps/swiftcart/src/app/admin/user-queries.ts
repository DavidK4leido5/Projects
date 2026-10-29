import "server-only";

import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { formatDate } from "@repo/shared";
import { getDb } from "@/lib/db";
import { addresses, orders, products, profiles, stores, type Role } from "@/lib/db/schema";

export const USERS_PER_PAGE = 20;

export const USER_ROLES = ["user", "store", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export type UserRoleFilter = UserRole | "all";

export function isUserRoleFilter(value: string): value is UserRoleFilter {
  return value === "all" || USER_ROLES.some((role) => role === value);
}

export type AdminUserStore = {
  name: string;
  slug: string;
  productCount: number;
};

export type AdminUserAddress = {
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal: string;
  country: string;
};

/** One row, complete enough for the drawer without a second fetch. */
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  joined: string;
  orderCount: number;
  store: AdminUserStore | null;
  address: AdminUserAddress | null;
};

export type AdminUsersPage = {
  users: AdminUser[];
  total: number;
  page: number;
  pages: number;
};

/**
 * One page of the admin directory, filtered and paged in Postgres. Store, saved
 * address, product count, and order count ride along as joins and correlated
 * counts so the drawer never needs another round trip.
 */
export async function listAdminUsers({
  q,
  role,
  page,
}: {
  q: string;
  role: UserRoleFilter;
  page: number;
}): Promise<AdminUsersPage> {
  const db = getDb();
  const current = Math.max(1, Math.trunc(page) || 1);
  const term = q.trim();
  const conditions: SQL[] = [];

  if (term) {
    const pattern = "%" + term.replace(/[\\%_]/g, (char) => "\\" + char) + "%";
    const match = or(ilike(profiles.name, pattern), ilike(profiles.email, pattern));
    if (match) conditions.push(match);
  }
  if (role !== "all") conditions.push(eq(profiles.role, role));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRows, userRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)`.mapWith(Number) })
      .from(profiles)
      .where(where),
    db
      .select({
        id: profiles.id,
        name: profiles.name,
        email: profiles.email,
        role: profiles.role,
        createdAt: profiles.createdAt,
        storeName: stores.name,
        storeSlug: stores.slug,
        productCount:
          sql<number>`(select count(*) from ${products} where ${products.storeId} = ${stores.id})`.mapWith(
            Number,
          ),
        orderCount:
          sql<number>`(select count(*) from ${orders} where ${orders.userId} = ${profiles.id})`.mapWith(
            Number,
          ),
        addressFullName: addresses.fullName,
        addressPhone: addresses.phone,
        addressLine1: addresses.line1,
        addressLine2: addresses.line2,
        addressCity: addresses.city,
        addressRegion: addresses.region,
        addressPostal: addresses.postal,
        addressCountry: addresses.country,
      })
      .from(profiles)
      .leftJoin(stores, eq(stores.ownerId, profiles.id))
      .leftJoin(addresses, eq(addresses.profileId, profiles.id))
      .where(where)
      .orderBy(desc(profiles.createdAt), desc(profiles.id))
      .limit(USERS_PER_PAGE)
      .offset((current - 1) * USERS_PER_PAGE),
  ]);

  const total = countRows[0]?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / USERS_PER_PAGE));

  return {
    users: userRows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role as Role,
      joined: formatDate(row.createdAt),
      orderCount: row.orderCount,
      store: row.storeSlug
        ? {
            name: row.storeName ?? row.storeSlug,
            slug: row.storeSlug,
            productCount: row.productCount,
          }
        : null,
      address: row.addressLine1
        ? {
            fullName: row.addressFullName ?? "",
            phone: row.addressPhone ?? "",
            line1: row.addressLine1,
            line2: row.addressLine2,
            city: row.addressCity ?? "",
            region: row.addressRegion,
            postal: row.addressPostal ?? "",
            country: row.addressCountry ?? "",
          }
        : null,
    })),
    total,
    page: current,
    pages,
  };
}
