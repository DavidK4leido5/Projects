"use client";

import Image from "next/image";
import { useState } from "react";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  if (!current) {
    return (
      <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-muted text-2xl text-muted-foreground">
        {name.charAt(0)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Image
        src={current}
        alt={name}
        width={1200}
        height={900}
        sizes="(min-width: 768px) 50vw, 100vw"
        priority
        className="aspect-[4/3] w-full rounded-lg border border-border object-cover"
      />

      {images.length > 1 ? (
        <ul className="flex flex-wrap gap-2">
          {images.map((key, index) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={"Show preview " + (index + 1)}
                aria-current={index === active}
                className={
                  "block overflow-hidden rounded-md border transition-colors " +
                  (index === active
                    ? "border-foreground"
                    : "border-border hover:border-muted-foreground")
                }
              >
                <Image src={key} alt="" width={64} height={64} className="h-16 w-16 object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
