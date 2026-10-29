"use client";

import { useRef, useState } from "react";
import { Button } from "@repo/ui";

type UploadResponse = { key?: string; error?: string };

export function ImageUpload({ initialKey }: { initialKey?: string | null }) {
  const [key, setKey] = useState(initialKey ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setPending(true);
    setError(null);

    try {
      const body = new FormData();
      body.append("file", file);

      const response = await fetch("/api/upload", { method: "POST", body });
      const data = (await response.json()) as UploadResponse;

      if (!response.ok || !data.key) {
        setError(data.error ?? "Upload failed. Try again.");
        return;
      }

      setKey(data.key);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove() {
    setKey(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex flex-col gap-3">
      {key ? (
        <img
          src={`/api/images/${key}`}
          alt="Product image preview"
          className="h-40 w-full rounded-md border border-neutral-200 object-cover"
        />
      ) : (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed border-neutral-300 text-sm text-neutral-500">
          No image
        </div>
      )}

      <input type="hidden" name="imageKey" value={key ?? ""} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          aria-label="Product image"
          disabled={pending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
          }}
          className="text-sm text-neutral-600 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-neutral-900 hover:file:bg-neutral-200"
        />
        {pending ? <span className="text-sm text-neutral-500">Uploading...</span> : null}
        {key ? (
          <Button variant="ghost" className="px-2 py-1" onClick={remove}>
            Remove
          </Button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
