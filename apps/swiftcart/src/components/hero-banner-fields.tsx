"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@repo/ui";

type Slot = "wide" | "tall";

const SLOTS: { slot: Slot; label: string; ratio: number; hint: string; frame: string }[] = [
  {
    slot: "wide",
    label: "Desktop banner",
    ratio: 16 / 9,
    hint: "16:9, 1920x1080 recommended",
    frame: "aspect-video",
  },
  {
    slot: "tall",
    label: "Mobile banner",
    ratio: 9 / 16,
    hint: "9:16, 1080x1920 recommended",
    frame: "aspect-[9/16]",
  },
];

const TOLERANCE = 0.02;

async function readSize(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = document.createElement("img");
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image."));
    };
    image.src = url;
  });
}

/**
 * Two art-directed banners for the hero. The ratio is checked in the browser
 * before upload; the server enforces that both exist when an item is featured.
 * ponytail: ratio is client-verified only, so a crafted POST can slip through.
 * Move the check into /api/upload when a decode dependency is worth it.
 */
export function HeroBannerFields({
  wideInitial,
  tallInitial,
}: {
  wideInitial?: string | null;
  tallInitial?: string | null;
}) {
  const [keys, setKeys] = useState<Record<Slot, string | null>>({
    wide: wideInitial ?? null,
    tall: tallInitial ?? null,
  });
  const [busy, setBusy] = useState<Slot | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Slot, string>>>({});

  async function choose(slot: Slot, file: File | undefined) {
    if (!file) return;
    const config = SLOTS.find((entry) => entry.slot === slot)!;
    setErrors((current) => ({ ...current, [slot]: undefined }));
    setBusy(slot);

    try {
      const { width, height } = await readSize(file);
      const ratio = width / height;
      if (Math.abs(ratio - config.ratio) / config.ratio > TOLERANCE) {
        setErrors((current) => ({
          ...current,
          [slot]:
            "That image is " + width + "x" + height + ". The banner must be " + config.hint + ".",
        }));
        return;
      }

      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as { key?: string; error?: string };
      if (!response.ok || !payload.key) {
        setErrors((current) => ({ ...current, [slot]: payload.error ?? "Upload failed." }));
        return;
      }
      setKeys((current) => ({ ...current, [slot]: payload.key! }));
    } catch (error) {
      setErrors((current) => ({
        ...current,
        [slot]: error instanceof Error ? error.message : "Upload failed.",
      }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="bannerWide" value={keys.wide ?? ""} />
      <input type="hidden" name="bannerTall" value={keys.tall ?? ""} />

      {SLOTS.map((config) => (
        <BannerSlot
          key={config.slot}
          config={config}
          value={keys[config.slot]}
          busy={busy === config.slot}
          error={errors[config.slot]}
          onChoose={(file) => void choose(config.slot, file)}
          onClear={() => setKeys((current) => ({ ...current, [config.slot]: null }))}
        />
      ))}
    </div>
  );
}

function BannerSlot({
  config,
  value,
  busy,
  error,
  onChoose,
  onClear,
}: {
  config: (typeof SLOTS)[number];
  value: string | null;
  busy: boolean;
  error?: string;
  onChoose: (file: File | undefined) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{config.label}</span>
        <span className="text-[11px] text-muted-foreground">{config.hint}</span>
      </div>

      <div
        className={
          "relative overflow-hidden rounded-md border " +
          (error ? "border-destructive " : "border-border ") +
          config.frame
        }
      >
        {value ? (
          <Image
            src={value}
            alt={config.label}
            width={config.slot === "wide" ? 640 : 360}
            height={config.slot === "wide" ? 360 : 640}
            className="h-full w-full object-cover"
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/40 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            {busy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            {busy ? "Uploading" : "Choose " + config.label.toLowerCase()}
          </button>
        )}

        {value ? (
          <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy ? <Loader2 className="animate-spin" /> : null}
              Replace
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={onClear}>
              <X />
              Remove
            </Button>
          </div>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          onChoose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
