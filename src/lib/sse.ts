import type { StreamChunk } from "@/lib/types";

export function isStreamChunk(value: unknown): value is StreamChunk {
  if (typeof value !== "object" || value === null) return false;
  const t = (value as { type?: unknown }).type;
  return t === "articles" || t === "object" || t === "done" || t === "error";
}

/**
 * Incremental Server-Sent Events parser. Feed it decoded text as it arrives;
 * it returns every complete, valid chunk and keeps the partial tail buffered.
 */
export function createSseParser(): (text: string) => StreamChunk[] {
  let buffer = "";
  return (text) => {
    buffer += text;
    const chunks: StreamChunk[] = [];
    let sep = buffer.indexOf("\n\n");
    while (sep !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      sep = buffer.indexOf("\n\n");

      const dataLine = frame
        .split("\n")
        .find((line) => line.startsWith("data: "));
      const payload = dataLine?.slice(6).trim();
      if (!payload) continue;
      try {
        const parsed: unknown = JSON.parse(payload);
        if (isStreamChunk(parsed)) chunks.push(parsed);
      } catch {
        // Malformed frame — skip it rather than abort the stream.
      }
    }
    return chunks;
  };
}

export function encodeSse(encoder: TextEncoder, chunk: StreamChunk): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`);
}
