import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = brand.name + ". " + brand.tagline;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const sans =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const palette = brand.pdf;

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: palette.ink,
        color: palette.paper,
        fontFamily: sans,
        padding: "72px 80px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="10" fill={palette.accent} />
            <path
              d="M4 27c6 0 9-13 16-13s10 13 16 13"
              stroke={palette.paper}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="36" cy="27" r="3.4" fill={palette.gold} />
          </svg>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: palette.paper,
            }}
          >
            {brand.name}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 18,
            letterSpacing: "0.04em",
            color: palette.border,
          }}
        >
          {brand.domain}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 64,
          fontWeight: 600,
          lineHeight: 1.14,
          letterSpacing: "-0.03em",
          maxWidth: 980,
          color: palette.paper,
        }}
      >
        {brand.tagline}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 32,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            lineHeight: 1.45,
            color: palette.soft,
            maxWidth: 620,
          }}
        >
          Cash flow, budgets, goals, and savings. Email and password only.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: 340,
            padding: "22px 26px",
            borderRadius: 18,
            border: "1px solid " + palette.border,
            backgroundColor: palette.paper,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", fontSize: 17, color: palette.muted }}>Total balance</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 26 }}>
              <div
                style={{
                  width: 8,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: palette.accent,
                  opacity: 0.45,
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 20,
                  borderRadius: 3,
                  backgroundColor: palette.accent,
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 26,
                  borderRadius: 3,
                  backgroundColor: palette.gold,
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: palette.ink,
            }}
          >
            ₱243,508.00
          </div>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
