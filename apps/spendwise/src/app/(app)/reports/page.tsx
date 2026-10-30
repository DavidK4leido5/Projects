import type { Metadata } from "next";
import { PageHeader } from "@repo/ui";
import { ReportBuilder } from "@/features/reports/report-builder";
import { listReportHistory } from "@/features/reports/queries";
import { getSettings } from "@/features/settings/queries";
import { listTransactionOptions } from "@/features/transactions/queries";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await requireUser();
  const [settings, options, history] = await Promise.all([
    getSettings(user.id),
    listTransactionOptions(user.id),
    listReportHistory(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Print-ready PDFs with charts, category and budget tables, and transaction detail."
      />
      <ReportBuilder
        accounts={options.accounts.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
        }))}
        categories={options.categories.map((category) => ({
          id: category.id,
          name: category.name,
          kind: category.kind,
        }))}
        history={history}
        currency={settings.currency}
        locale={settings.locale}
      />
    </div>
  );
}
