# Data model

Postgres on Neon, Drizzle, HTTP driver. **No transactions**; write flows compensate on failure.

## Tables

| Table               | Key columns                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `profiles`          | id (Neon Auth id), name, email, role (`user`/`store`/`admin`), fullName, phone                                        |
| `stores`            | id, slug, name, ownerId → profiles, tagline, bannerKey                                                                |
| `products`          | id, storeId, slug, name, category, description, priceCents, stock (rollup), featured, properties (jsonb), banner keys |
| `product_images`    | productId, key, position                                                                                              |
| `product_variants`  | productId, combinationKey, options (jsonb), priceCents?, stock, sku, imageKey                                         |
| `carts`             | id, userId?, token (guest cookie)                                                                                     |
| `cart_items`        | cartId, productId, variantId, quantity; unique (cartId, variantId)                                                    |
| `addresses`         | one per profile, delivery snapshot fields                                                                             |
| `orders`            | id, userId?, accessToken (receipt), publicRef, customer + delivery snapshot, totalCents, status                       |
| `order_items`       | orderId, storeId, productId, variantId, optionSummary, productName, storeName, priceCents, quantity                   |
| `order_fulfilments` | orderId, storeId, status; unique (orderId, storeId)                                                                   |
| `order_events`      | orderId, storeId?, actorId, fromStatus, toStatus, note (audit trail)                                                  |

## Invariants

- **Stock is claimed per variant** with a conditional update (`where stock >= qty`); a failed claim
  compensates by restoring earlier claims. Cancelling a slice restores its stock exactly once.
- **Order lines are snapshots.** Renaming or deleting a product must not rewrite history.
- **Fulfilment is per store**, because one cart can span stores. The order status is rolled up: the
  slowest slice decides; all delivered is completed; all cancelled is cancelled.
- **Guests are first-class.** A cart is found by user id or by the `swiftcart_cart` cookie; on sign-in the
  guest cart merges (quantities add, capped at stock). Orders accept `userId = null` and keep the delivery
  snapshot plus an `access_token` used as the receipt link.

## Enumeration values

- Roles: `user`, `store`, `admin`.
- Slice status: `processing → packed → shipped → delivered`; `cancelled` only from processing.
- Categories: free text on products, surfaced through `listProductCategories()`; "Uncategorised" when null.

## Migrations

`drizzle/` holds numbered SQL files plus `meta/_journal.json` snapshots. The workflow that avoids Drizzle
guessing at renames:

1. Add the new nullable shape, generate, apply.
2. Backfill with SQL in the same migration.
3. Remove the old shape, generate, apply.

Never rename a column in one step; never let `drizzle-kit generate` prompt on a rename.
