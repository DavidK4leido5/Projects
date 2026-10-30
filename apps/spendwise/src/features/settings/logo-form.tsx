"use client";

import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@repo/ui";
import { removeReportLogo, uploadReportLogo } from "@/features/settings/actions";

export function LogoForm({ currentUrl }: { currentUrl: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [fileName, setFileName] = useState<string | null>(null);

  function onFile(file: File | null) {
    if (!file) return;
    setFileName(file.name);
    const data = new FormData();
    data.set("file", file);
    startTransition(async () => {
      const result = await uploadReportLogo(data);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Report logo updated");
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await removeReportLogo();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Report logo removed");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {currentUrl ? (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/40 p-3">
          <Image
            src={currentUrl}
            alt="Current report logo"
            width={160}
            height={48}
            className="h-10 w-auto max-w-[160px] object-contain"
            unoptimized
          />
          <Button type="button" variant="ghost" size="sm" onClick={remove} disabled={pending}>
            <Trash2 className="size-4" aria-hidden />
            Remove
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Upload a small logo to brand your PDF reports. PNG, JPEG, or WebP up to 2 MB.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm" disabled={pending}>
          <label className="cursor-pointer">
            {pending ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="size-4" aria-hidden />
            )}
            {pending ? "Uploading" : "Upload logo"}
            <input
              type="file"
              className="sr-only"
              accept="image/png,image/jpeg,image/webp"
              disabled={pending}
              onChange={(event) => onFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </Button>
        {fileName ? <span className="text-xs text-muted-foreground">{fileName}</span> : null}
      </div>
    </div>
  );
}
