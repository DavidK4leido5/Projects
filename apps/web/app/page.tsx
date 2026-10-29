import { formatDate } from "@repo/shared";
import { Button, Card, CardTitle } from "@repo/ui";

export default function Page() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Monorepo is running</h1>
        <p className="text-sm text-neutral-600">
          This app consumes <code>@repo/ui</code> and <code>@repo/shared</code> as workspace
          packages.
        </p>
      </header>

      <Card className="flex flex-col gap-3">
        <CardTitle>Shared components</CardTitle>
        <p className="text-sm text-neutral-600">Rendered {formatDate(new Date())}.</p>
        <div className="flex flex-wrap gap-2">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </Card>
    </main>
  );
}
