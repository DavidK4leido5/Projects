ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_user_id_profiles_id_fk";
--> statement-breakpoint
DROP INDEX "cart_items_user_variant_idx";--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "cart_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" DROP COLUMN "user_id";