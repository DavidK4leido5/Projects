"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { DEMO_EMAIL, DEMO_PASSWORD } from "./demo-account";

export function DemoCredentials() {
  async function copyCredentials() {
    try {
      await navigator.clipboard.writeText(DEMO_EMAIL + "\n" + DEMO_PASSWORD);
      toast.success("Demo credentials copied");
    } catch {
      toast.error("Could not copy. Select the credentials and copy manually.");
    }
  }

  return (
    <div className="border-t pt-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Demo account</p>
          <div className="space-y-0.5 font-mono text-xs">
            <p className="break-all select-all">{DEMO_EMAIL}</p>
            <p className="break-all select-all">{DEMO_PASSWORD}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={copyCredentials}
          aria-label="Copy demo credentials"
          className="shrink-0"
        >
          <Copy className="size-3.5" aria-hidden />
          Copy
        </Button>
      </div>
    </div>
  );
}
