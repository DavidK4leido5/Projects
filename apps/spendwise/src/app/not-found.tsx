import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { Button, EmptyState } from "@repo/ui";
import { brand } from "@/lib/brand";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md">
        <EmptyState
          icon={FileQuestion}
          title="Page not found"
          description={`That link does not point anywhere in ${brand.name}.`}
          action={
            <Button asChild size="sm">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
