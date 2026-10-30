CREATE SCHEMA "spendwise";
--> statement-breakpoint
CREATE TYPE "spendwise"."account_type" AS ENUM('cash', 'bank', 'ewallet', 'credit_card', 'savings', 'investment');--> statement-breakpoint
CREATE TYPE "spendwise"."category_kind" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "spendwise"."goal_status" AS ENUM('active', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "spendwise"."notification_type" AS ENUM('budget_alert', 'bill_due', 'bill_overdue', 'goal_milestone', 'system');--> statement-breakpoint
CREATE TYPE "spendwise"."payment_method" AS ENUM('cash', 'debit_card', 'credit_card', 'bank_transfer', 'ewallet', 'other');--> statement-breakpoint
CREATE TYPE "spendwise"."recurring_frequency" AS ENUM('daily', 'weekly', 'monthly', 'yearly', 'custom');--> statement-breakpoint
CREATE TYPE "spendwise"."report_type" AS ENUM('monthly_summary', 'custom_range', 'category_spending', 'cash_flow', 'budget_performance', 'annual_summary');--> statement-breakpoint
CREATE TYPE "spendwise"."theme" AS ENUM('light', 'dark', 'system');--> statement-breakpoint
CREATE TYPE "spendwise"."transaction_type" AS ENUM('income', 'expense', 'transfer');--> statement-breakpoint
CREATE TABLE "spendwise"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"type" "spendwise"."account_type" NOT NULL,
	"starting_balance" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'PHP' NOT NULL,
	"color" varchar(20) DEFAULT 'slate' NOT NULL,
	"icon" varchar(40) DEFAULT 'wallet' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "spendwise"."attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_id" uuid,
	"file_name" varchar(200) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_key" text NOT NULL,
	"provider" varchar(20) DEFAULT 'neon' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spendwise"."budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid,
	"period_month" date NOT NULL,
	"amount" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'PHP' NOT NULL,
	"rollover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_amount_positive" CHECK (amount > 0)
);
--> statement-breakpoint
CREATE TABLE "spendwise"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"kind" "spendwise"."category_kind" NOT NULL,
	"parent_id" uuid,
	"color" varchar(20) DEFAULT 'slate' NOT NULL,
	"icon" varchar(40) DEFAULT 'tag' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "spendwise"."goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"account_id" uuid,
	"amount" bigint NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_contributions_amount_positive" CHECK (amount > 0)
);
--> statement-breakpoint
CREATE TABLE "spendwise"."goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"target_amount" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'PHP' NOT NULL,
	"target_date" date,
	"linked_account_id" uuid,
	"note" text,
	"color" varchar(20) DEFAULT 'emerald' NOT NULL,
	"status" "spendwise"."goal_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "goals_target_positive" CHECK (target_amount > 0)
);
--> statement-breakpoint
CREATE TABLE "spendwise"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "spendwise"."notification_type" NOT NULL,
	"title" varchar(120) NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spendwise"."recurring_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"type" "spendwise"."transaction_type" NOT NULL,
	"amount" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'PHP' NOT NULL,
	"payee" varchar(120) NOT NULL,
	"notes" text,
	"payment_method" "spendwise"."payment_method" DEFAULT 'other' NOT NULL,
	"frequency" "spendwise"."recurring_frequency" DEFAULT 'monthly' NOT NULL,
	"interval" integer DEFAULT 1 NOT NULL,
	"day_of_month" integer,
	"weekday" integer,
	"start_date" date NOT NULL,
	"end_date" date,
	"next_run_at" timestamp with time zone NOT NULL,
	"last_run_at" timestamp with time zone,
	"auto_post" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "recurring_amount_positive" CHECK (amount > 0),
	CONSTRAINT "recurring_interval_positive" CHECK (interval > 0)
);
--> statement-breakpoint
CREATE TABLE "spendwise"."reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "spendwise"."report_type" NOT NULL,
	"title" varchar(120) NOT NULL,
	"date_from" date NOT NULL,
	"date_to" date NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spendwise"."tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"color" varchar(20) DEFAULT 'slate' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spendwise"."transaction_tags" (
	"transaction_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "transaction_tags_pk" PRIMARY KEY("transaction_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "spendwise"."transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid,
	"transfer_account_id" uuid,
	"recurring_rule_id" uuid,
	"type" "spendwise"."transaction_type" NOT NULL,
	"amount" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'PHP' NOT NULL,
	"exchange_rate" numeric(18, 8),
	"base_amount" bigint,
	"date" timestamp with time zone NOT NULL,
	"payee" varchar(120) NOT NULL,
	"notes" text,
	"payment_method" "spendwise"."payment_method" DEFAULT 'other' NOT NULL,
	"is_recurring" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "transactions_amount_positive" CHECK (amount > 0),
	CONSTRAINT "transactions_transfer_target" CHECK ((type <> 'transfer') or (transfer_account_id is not null and transfer_account_id <> account_id))
);
--> statement-breakpoint
CREATE TABLE "spendwise"."user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"currency" varchar(3) DEFAULT 'PHP' NOT NULL,
	"locale" varchar(20) DEFAULT 'en-PH' NOT NULL,
	"date_format" varchar(20) DEFAULT 'MMM d, yyyy' NOT NULL,
	"first_day_of_week" integer DEFAULT 1 NOT NULL,
	"financial_month_start" integer DEFAULT 1 NOT NULL,
	"theme" "spendwise"."theme" DEFAULT 'system' NOT NULL,
	"report_logo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spendwise"."attachments" ADD CONSTRAINT "attachments_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "spendwise"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "spendwise"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "spendwise"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "spendwise"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."goal_contributions" ADD CONSTRAINT "goal_contributions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "spendwise"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."goals" ADD CONSTRAINT "goals_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "spendwise"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."recurring_rules" ADD CONSTRAINT "recurring_rules_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "spendwise"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."recurring_rules" ADD CONSTRAINT "recurring_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "spendwise"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."transaction_tags" ADD CONSTRAINT "transaction_tags_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "spendwise"."transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."transaction_tags" ADD CONSTRAINT "transaction_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "spendwise"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "spendwise"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "spendwise"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."transactions" ADD CONSTRAINT "transactions_transfer_account_id_accounts_id_fk" FOREIGN KEY ("transfer_account_id") REFERENCES "spendwise"."accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "spendwise"."transactions" ADD CONSTRAINT "transactions_recurring_rule_id_recurring_rules_id_fk" FOREIGN KEY ("recurring_rule_id") REFERENCES "spendwise"."recurring_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "spendwise"."accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "accounts_user_archived_idx" ON "spendwise"."accounts" USING btree ("user_id","archived");--> statement-breakpoint
CREATE INDEX "attachments_user_transaction_idx" ON "spendwise"."attachments" USING btree ("user_id","transaction_id");--> statement-breakpoint
CREATE INDEX "budgets_user_period_idx" ON "spendwise"."budgets" USING btree ("user_id","period_month");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_category_unique_idx" ON "spendwise"."budgets" USING btree ("user_id","category_id","period_month") WHERE category_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_overall_unique_idx" ON "spendwise"."budgets" USING btree ("user_id","period_month") WHERE category_id is null;--> statement-breakpoint
CREATE INDEX "categories_user_idx" ON "spendwise"."categories" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "categories_user_kind_idx" ON "spendwise"."categories" USING btree ("user_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_parent_name_idx" ON "spendwise"."categories" USING btree ("user_id","parent_id","name") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "goal_contributions_user_goal_idx" ON "spendwise"."goal_contributions" USING btree ("user_id","goal_id");--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_date_idx" ON "spendwise"."goal_contributions" USING btree ("goal_id","date");--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "spendwise"."goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "spendwise"."notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "spendwise"."notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE INDEX "recurring_user_idx" ON "spendwise"."recurring_rules" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "recurring_user_next_idx" ON "spendwise"."recurring_rules" USING btree ("user_id","next_run_at");--> statement-breakpoint
CREATE INDEX "reports_user_created_idx" ON "spendwise"."reports" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "tags_user_name_idx" ON "spendwise"."tags" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "transaction_tags_tag_idx" ON "spendwise"."transaction_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "spendwise"."transactions" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "transactions_user_category_idx" ON "spendwise"."transactions" USING btree ("user_id","category_id");--> statement-breakpoint
CREATE INDEX "transactions_user_account_idx" ON "spendwise"."transactions" USING btree ("user_id","account_id");--> statement-breakpoint
CREATE INDEX "transactions_user_type_date_idx" ON "spendwise"."transactions" USING btree ("user_id","type","date");--> statement-breakpoint
CREATE INDEX "transactions_recurring_idx" ON "spendwise"."transactions" USING btree ("recurring_rule_id");