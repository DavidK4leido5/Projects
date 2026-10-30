"use client";

import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@repo/ui";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="w-full max-w-md">
        <EmptyState
          icon={AlertTriangle}
          title="Something went wrong"
          description="The page could not load. Try again; if it keeps happening, refresh the browser."
          action={
            <Button size="sm" onClick={reset}>
              Try again
            </Button>
          }
        />
      </div>
    </div>
  );
}
