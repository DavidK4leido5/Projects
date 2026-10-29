CREATE TABLE "addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"line1" text NOT NULL,
	"line2" text,
	"city" text NOT NULL,
	"region" text,
	"postal" text NOT NULL,
	"country" text DEFAULT 'PH' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "addresses_profile_id_unique" UNIQUE("profile_id")
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_token_unique" UNIQUE("token")
);
--> statement-breakpoint
DROP INDEX "cart_items_user_idx";--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "cart_id" uuid;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "full_name" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "carts_user_idx" ON "carts" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cart_items_cart_variant_idx" ON "cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE INDEX "cart_items_cart_idx" ON "cart_items" USING btree ("cart_id");
--> statement-breakpoint
INSERT INTO "carts" ("user_id", "token")
SELECT p."id", gen_random_uuid()::text
FROM "profiles" p
WHERE EXISTS (SELECT 1 FROM "cart_items" ci WHERE ci."user_id" = p."id");
--> statement-breakpoint
UPDATE "cart_items" ci
SET "cart_id" = (SELECT c."id" FROM "carts" c WHERE c."user_id" = ci."user_id" LIMIT 1)
WHERE ci."cart_id" IS NULL;
