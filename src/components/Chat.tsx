"use client";

import { useChat } from "@ai-sdk/react";
import { useState } from "react";

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
import { trackEvent } from "@/lib/analytics";
import { codeFromChatError, errorKey } from "@/lib/errors";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import type { NewsArticle, PartialSummary, Provider } from "@/lib/types";

function chatErrorKey(message: string): TranslationKey {
  const code = codeFromChatError(message);
  return code ? errorKey(code) : "errorChatFailed";
}

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

  const { messages, sendMessage, status, error, stop } = useChat();

  const isGenerating = status === "streaming" || status === "submitted";
  const grounded = ticker !== null && articles.length > 0;

  const placeholder = grounded
    ? t("chatPlaceholderGrounded", { ticker: ticker ?? "" })
    : t("chatPlaceholderUngrounded");

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[3px] border border-rule bg-paper-raised">
      <header className="flex shrink-0 items-baseline justify-between gap-3 border-b border-rule px-5 py-3">
        <h2 className="font-serif text-lg font-medium text-ink">{t("chatTitle")}</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-subtle">
          {t("chatBadge")}
        </span>
      </header>

      <Conversation className="flex-1">
        <ConversationContent className="space-y-3 px-4 py-4">
          {messages.length === 0 ? (
            <ConversationEmptyState
              className="items-start justify-start p-1 text-left"
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
        <ConversationScrollButton aria-label={t("scrollToLatest")} />
      </Conversation>

      {error ? (
        <div role="alert" className="shrink-0 border-t border-down/40 bg-highlight px-5 py-2 text-xs text-down">
          {t("chatErrorPrefix")}: {t(chatErrorKey(error.message))}
        </div>
      ) : null}

      <div className="shrink-0 border-t border-rule p-3">
        <PromptInput
          onSubmit={(message, event) => {
            event.preventDefault();
            const text = message.text.trim();
            if (!text || isGenerating) return;
            sendMessage(
              { text },
              {
                body: {
                  provider,
                  language,
                  ticker,
                  articles,
                  summary,
                },
              },
            );
            setInput("");
            trackEvent("chat_message", { grounded, language });
          }}
          className="flex items-end gap-2 rounded-[3px] bg-paper p-1.5"
        >
          <PromptInputTextarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={1}
            maxLength={2000}
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
