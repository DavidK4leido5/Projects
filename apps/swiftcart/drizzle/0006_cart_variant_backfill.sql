DROP INDEX "cart_items_user_product_idx";
--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "variant_id" uuid;
--> statement-breakpoint

-- One hidden variant per existing product, carrying its price and stock.
INSERT INTO "product_variants" ("product_id", "options", "price_cents", "stock", "position")
SELECT p."id", '{}'::jsonb, NULL, p."stock", 0
FROM "products" p
WHERE NOT EXISTS (SELECT 1 FROM "product_variants" v WHERE v."product_id" = p."id");
--> statement-breakpoint

UPDATE "cart_items" c
SET "variant_id" = (
  SELECT v."id" FROM "product_variants" v
  WHERE v."product_id" = c."product_id"
  ORDER BY v."position" LIMIT 1
);
--> statement-breakpoint

UPDATE "order_items" o
SET "variant_id" = (
  SELECT v."id" FROM "product_variants" v
  WHERE v."product_id" = o."product_id"
  ORDER BY v."position" LIMIT 1
)
WHERE o."product_id" IS NOT NULL;
--> statement-breakpoint

DELETE FROM "cart_items" WHERE "variant_id" IS NULL;
--> statement-breakpoint

ALTER TABLE "cart_items" ALTER COLUMN "variant_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_user_variant_idx" ON "cart_items" USING btree ("user_id","variant_id");
