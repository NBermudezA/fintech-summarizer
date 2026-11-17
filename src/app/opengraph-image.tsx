import { ImageResponse } from "next/og";

export const alt =
  "Fintech Summarizer — AI briefings for any stock or crypto ticker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background:
            "radial-gradient(circle at 0% 0%, rgba(16,185,129,0.25), transparent 50%), #050505",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            padding: "8px 20px",
            borderRadius: 999,
            border: "1px solid rgba(16,185,129,0.4)",
            color: "#6ee7b7",
            fontSize: 28,
          }}
        >
          AI-powered market briefings
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 32 }}>
          Fintech Summarizer
        </div>
        <div style={{ fontSize: 36, color: "#a1a1aa", marginTop: 16 }}>
          Latest news + streaming AI summary for AAPL, NVDA, BTC and more.
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 48 }}>
          {["BULLISH", "NEUTRAL", "BEARISH"].map((s, i) => (
            <div
              key={s}
              style={{
                padding: "10px 22px",
                borderRadius: 999,
                fontSize: 26,
                fontWeight: 600,
                color: ["#6ee7b7", "#d4d4d8", "#fda4af"][i],
                background: [
                  "rgba(16,185,129,0.12)",
                  "rgba(113,113,122,0.15)",
                  "rgba(244,63,94,0.12)",
                ][i],
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
