"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@repo/ui";

const MAX_IMAGES = 10;

type ImageFieldProps = {
  initial?: string[];
  onChange?: (images: string[]) => void;
};

/**
 * Uploads go straight to /api/upload, which writes object storage and
 * Cloudinary. The ordered keys are submitted as one hidden JSON field.
 */
export function ProductImagesField({ initial = [], onChange }: ImageFieldProps) {
  const [images, setImages] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function update(next: string[]) {
    setImages(next);
    onChange?.(next);
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setError("All 10 preview slots are taken.");
      return;
    }

    setBusy(true);
    const uploaded: string[] = [];

    for (const file of Array.from(files).slice(0, room)) {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/upload", { method: "POST", body });
      const payload = (await response.json()) as { key?: string; error?: string };

      if (!response.ok || !payload.key) {
        setError(payload.error ?? "Upload failed.");
        break;
      }
      uploaded.push(payload.key);
    }

    setBusy(false);
    if (uploaded.length > 0) update([...images, ...uploaded]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    update(next);
  }

  function remove(index: number) {
    update(images.filter((_, position) => position !== index));
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name="images" value={JSON.stringify(images)} />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || images.length >= MAX_IMAGES}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
          {busy ? "Uploading" : "Add preview"}
        </Button>
        <span className="text-xs text-muted-foreground">
          {images.length} of {MAX_IMAGES}. The first image is the cover.
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => void onFiles(event.target.files)}
        />
      </div>

      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((key, index) => (
            <li
              key={key}
              className="group relative overflow-hidden rounded-md border border-border"
            >
              <Image
                src={key}
                alt={"Preview " + (index + 1)}
                width={200}
                height={200}
                className="aspect-square w-full object-cover"
              />
              {index === 0 ? (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                  Cover
                </span>
              ) : null}
              <div className="absolute inset-x-1 bottom-1 flex items-center justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <div className="flex gap-1">
                  <button
                    type="button"
                    aria-label="Move left"
                    onClick={() => move(index, -1)}
                    className="rounded bg-background/90 p-1 shadow-sm hover:bg-background"
                  >
                    <ArrowLeft className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move right"
                    onClick={() => move(index, 1)}
                    className="rounded bg-background/90 p-1 shadow-sm hover:bg-background"
                  >
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => remove(index)}
                  className="rounded bg-background/90 p-1 shadow-sm hover:bg-background"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          No previews yet. Add up to 10.
        </p>
      )}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
