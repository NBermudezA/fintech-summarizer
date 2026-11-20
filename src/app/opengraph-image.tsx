import { ImageResponse } from "next/og";

export const alt =
  "Fintech Summarizer — AI briefings for any stock or crypto ticker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const PAPER = "#f6f3ec";
const INK = "#1a1917";
const SUBTLE = "#5f5b54";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px 80px",
          background: PAPER,
          color: INK,
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            paddingBottom: 16,
            borderBottom: `1px solid ${SUBTLE}`,
            fontFamily: "monospace",
            fontSize: 22,
            letterSpacing: 4,
            color: SUBTLE,
          }}
        >
          <span>AI MARKET BRIEFINGS</span>
          <span>STOCKS · CRYPTO</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 64,
            fontSize: 120,
            fontWeight: 500,
            letterSpacing: -3,
            lineHeight: 1,
          }}
        >
          Fintech Summarizer
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            paddingBottom: 40,
            borderBottom: `4px solid ${INK}`,
            fontSize: 38,
            fontStyle: "italic",
            color: "#3b3935",
          }}
        >
          The latest news on any ticker, summarized by Claude in seconds.
        </div>
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 36,
            fontFamily: "monospace",
            fontSize: 28,
            letterSpacing: 2,
          }}
        >
          <span style={{ color: "#17703f" }}>BULLISH</span>
          <span style={{ color: SUBTLE }}>NEUTRAL</span>
          <span style={{ color: "#b42318" }}>BEARISH</span>
        </div>
      </div>
    ),
    size,
  );
}
