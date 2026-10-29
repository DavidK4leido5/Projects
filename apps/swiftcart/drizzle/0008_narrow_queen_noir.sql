ALTER TABLE "orders" ALTER COLUMN "customer_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_phone" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_line1" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_line2" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_city" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_region" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_postal" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_country" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "access_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_access_token_unique" UNIQUE("access_token");