import { ImageResponse } from "next/og";

export const alt = "SpendWise: know where your money goes, and where it's headed.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const sans =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#0b1220",
        color: "#f4f6f5",
        fontFamily: sans,
        padding: "72px 80px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect
            x="3"
            y="7"
            width="34"
            height="26"
            rx="8"
            fill="#14b8a6"
            fillOpacity="0.16"
            stroke="#14b8a6"
            strokeWidth="2.5"
          />
          <circle cx="29" cy="20" r="3" fill="#14b8a6" />
        </svg>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "#e8ecea",
          }}
        >
          SpendWise
        </div>
      </div>

      <div
        style={{
          display: "flex",
          fontSize: 62,
          fontWeight: 600,
          lineHeight: 1.12,
          letterSpacing: "-0.03em",
          maxWidth: 940,
          color: "#f7f8f7",
        }}
      >
        Know where your money goes, and where it&apos;s headed.
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            lineHeight: 1.4,
            color: "#9aa4b2",
            maxWidth: 600,
          }}
        >
          Personal finance, kept simple. Email and password only.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            width: 340,
            padding: "22px 26px",
            borderRadius: 18,
            border: "1px solid #223046",
            backgroundColor: "#111a2b",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", fontSize: 17, color: "#8b98ab" }}>Total balance</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 26 }}>
              <div
                style={{
                  width: 8,
                  height: 12,
                  borderRadius: 3,
                  backgroundColor: "#14b8a6",
                  opacity: 0.45,
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 20,
                  borderRadius: 3,
                  backgroundColor: "#14b8a6",
                  opacity: 0.7,
                }}
              />
              <div
                style={{
                  width: 8,
                  height: 26,
                  borderRadius: 3,
                  backgroundColor: "#14b8a6",
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
              color: "#f4f6f5",
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
