"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { MessageSquare, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { useLanguage } from "@/lib/i18n";
import type { NewsArticle, PartialSummary, Provider } from "@/lib/types";

interface ChatProps {
  provider: Provider;
  ticker: string | null;
  articles: NewsArticle[];
  summary: PartialSummary | null;
}

export default function Chat({
  provider,
  ticker,
  articles,
  summary,
}: ChatProps) {
  const { language, t } = useLanguage();
  const [input, setInput] = useState("");

  const latest = useRef({ provider, language, ticker, articles, summary });
  useEffect(() => {
    latest.current = { provider, language, ticker, articles, summary };
  }, [provider, language, ticker, articles, summary]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => ({
          body: {
            messages,
            provider: latest.current.provider,
            language: latest.current.language,
            ticker: latest.current.ticker,
            articles: latest.current.articles,
            summary: latest.current.summary,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop } = useChat({ transport });

  const isGenerating = status === "streaming" || status === "submitted";
  const grounded = ticker !== null && articles.length > 0;

  const placeholder = grounded
    ? t("chatPlaceholderGrounded", { ticker: ticker ?? "" })
    : t("chatPlaceholderUngrounded");

  return (
    <div className="flex h-[34rem] flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800/80 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <MessageSquare
            className="size-4 text-emerald-400"
            aria-hidden="true"
          />
          {t("chatTitle")}
        </div>
        <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-inset ring-emerald-500/20">
          {t("chatBadge")}
        </span>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="space-y-3 px-4 py-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={
                <Sparkles
                  className="size-6 text-emerald-300"
                  aria-hidden="true"
                />
              }
              title={
                grounded
                  ? t("chatEmptyTitleGrounded", { ticker: ticker ?? "" })
                  : t("chatEmptyTitleUngrounded")
              }
              description={
                grounded
                  ? t("chatEmptyDescriptionGrounded")
                  : t("chatEmptyDescriptionUngrounded")
              }
            />
          ) : (
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.role === "assistant"
                    ? message.parts?.map((part, i) => {
                        switch (part.type) {
                          case "text":
                            return (
                              <MessageResponse key={`${message.id}-${i}`}>
                                {part.text}
                              </MessageResponse>
                            );
                          // When tools are added in src/app/api/chat/tools.ts,
                          // render their outputs here. Tool parts are named
                          // `tool-<name>` (e.g. `tool-analyzeTicker`).
                          default:
                            return null;
                        }
                      })
                    : message.parts?.map((part, i) =>
                        part.type === "text" ? (
                          <span key={`${message.id}-${i}`}>{part.text}</span>
                        ) : null,
                      )}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {error ? (
        <div className="shrink-0 border-t border-rose-500/30 bg-rose-500/5 px-5 py-2 text-xs text-rose-300">
          {t("chatErrorPrefix")}: {error.message}
        </div>
      ) : null}

      <div className="shrink-0 border-t border-zinc-800/80 p-3">
        <PromptInput
          onSubmit={(message, event) => {
            event.preventDefault();
            const text = message.text.trim();
            if (!text || isGenerating) return;
            sendMessage({ text });
            setInput("");
          }}
          className="flex items-end gap-2 rounded-xl bg-zinc-900/80 p-2 ring-1 ring-inset ring-zinc-800"
        >
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={1}
            disabled={isGenerating}
            className="flex-1 bg-transparent"
            aria-label={t("chatInputLabel")}
          />
          <PromptInputSubmit
            disabled={!isGenerating && input.trim().length === 0}
            status={status}
            onStop={stop}
            aria-label={isGenerating ? t("stopLabel") : t("sendLabel")}
          />
        </PromptInput>
      </div>
    </div>
  );
}
