import type { Metadata } from "next";
import { WifiOff } from "lucide-react";
import Link from "next/link";
import { Button, EmptyState } from "@repo/ui";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-md">
        <EmptyState
          icon={WifiOff}
          title="You are offline"
          description="SpendWise needs a connection to load your accounts and transactions. Reconnect and try again."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard">Try again</Link>
            </Button>
          }
        />
      </div>
    </main>
  );
}
