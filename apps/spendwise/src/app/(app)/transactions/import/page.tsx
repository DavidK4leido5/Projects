import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, PageHeader } from "@repo/ui";
import { CsvImportWizard } from "@/features/transactions/csv-import";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Import transactions" };

export default async function ImportTransactionsPage() {
  await requireUser();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import transactions"
        description="Bring a bank or spreadsheet export in as transactions."
        actions={
          <Button asChild variant="outline">
            <Link href="/transactions">
              <ArrowLeft className="size-4" aria-hidden />
              Back
            </Link>
          </Button>
        }
      />
      <CsvImportWizard />
    </div>
  );
}
