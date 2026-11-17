import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "@/lib/i18n";
import type { NewsArticle } from "@/lib/types";

const chatState = vi.hoisted(() => ({
  messages: [] as unknown[],
  status: "ready" as string,
  error: undefined as Error | undefined,
  sendMessage: vi.fn(),
  stop: vi.fn(),
}));

vi.mock("@ai-sdk/react", () => ({ useChat: () => chatState }));

const { default: Chat } = await import("@/components/Chat");

const ARTICLE: NewsArticle = {
  title: "T",
  description: null,
  url: "https://x.test",
  publishedAt: "2026-01-01",
  source: { name: "S" },
};

const renderChat = (props: Partial<Parameters<typeof Chat>[0]> = {}) =>
  render(
    <LanguageProvider>
      <Chat provider="anthropic" ticker={null} articles={[]} summary={null} {...props} />
    </LanguageProvider>,
  );

beforeEach(() => {
  chatState.messages = [];
  chatState.status = "ready";
  chatState.error = undefined;
  chatState.sendMessage.mockReset();
  chatState.stop.mockReset();
});

describe("Chat", () => {
  it("shows the ungrounded empty state and the AI-assistant badge", () => {
    renderChat();
    expect(screen.getByText("Ask a financial question")).toBeInTheDocument();
    expect(screen.getByText("AI assistant")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ask anything about finance…")).toBeInTheDocument();
  });

  it("sends grounded context with each message and clears the input", async () => {
    const gtag = vi.fn();
    (window as unknown as { gtag: typeof gtag }).gtag = gtag;
    const user = userEvent.setup();
    renderChat({ ticker: "AAPL", articles: [ARTICLE], summary: { headline: "H" } });

    expect(screen.getByText("Ask about AAPL")).toBeInTheDocument();
    const input = screen.getByLabelText("Chat input");
    await user.type(input, "  Why up?  ");
    await user.click(screen.getByRole("button", { name: "Send message" }));

    expect(chatState.sendMessage).toHaveBeenCalledWith(
      { text: "Why up?" },
      {
        body: {
          provider: "anthropic",
          language: "en",
          ticker: "AAPL",
          articles: [ARTICLE],
          summary: { headline: "H" },
        },
      },
    );
    expect(input).toHaveValue("");
    expect(gtag).toHaveBeenCalledWith("event", "chat_message", { grounded: true, language: "en" });
    delete (window as unknown as { gtag?: unknown }).gtag;
  });

  it("ignores whitespace-only submissions", async () => {
    const user = userEvent.setup();
    renderChat();
    await user.type(screen.getByLabelText("Chat input"), "   {Enter}");
    expect(chatState.sendMessage).not.toHaveBeenCalled();
  });

  it("renders user and assistant messages, skipping non-text parts", () => {
    chatState.messages = [
      { id: "u1", role: "user", parts: [{ type: "text", text: "Hello there" }, { type: "file" }] },
      {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text: "General answer" }, { type: "tool-x" }],
      },
    ];
    renderChat();
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.getByText("General answer")).toBeInTheDocument();
  });

  it("lets the user stop generation and shows errors", async () => {
    chatState.status = "streaming";
    chatState.error = new Error("Rate limited");
    const user = userEvent.setup();
    renderChat();
    expect(screen.getByText("Chat error: Rate limited")).toBeInTheDocument();
    expect(screen.getByLabelText("Chat input")).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Stop" }));
    expect(chatState.stop).toHaveBeenCalled();
  });
});
