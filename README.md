# Fintech Summarizer

AI-powered market briefings. Type a stock or crypto ticker and get the latest 5 news articles plus a streaming, structured summary written by Claude — with a grounded chat for follow-up questions.

Project 1 of an AI Engineering roadmap, built on Next.js 16 + Vercel AI SDK v6.

## 🚀 Live Demo

**[https://fintech-summarizer.vercel.app/](https://fintech-summarizer.vercel.app/)**

## Features

- **Live news feed** — last 5 articles for any ticker, fetched from NewsAPI.
- **Streaming AI summary** — `streamText` + `Output.object({ schema })` produces a typed object as it streams: headline, market overview, three key insights, sentiment (BULLISH / BEARISH / NEUTRAL).
- **Grounded chat** — financial-advisor persona that answers questions about the loaded articles + summary. Will not invent facts; falls back to general financial knowledge for concepts only.
- **EN / ES toggle** — switches all UI strings and tells the model to respond in Spanish or English.
- **Popular ticker dropdown** — curated list of common stocks and crypto with company names, so you don't have to remember symbols.
- **Search history** — last 5 tickers persisted in `localStorage`; one click to re-run the analysis.
- **Dark fintech theme** — Tailwind v4, lucide icons, AI Elements primitives for the chat.

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript strict, no `any`
- Tailwind CSS v4
- Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`)
- Zod 4 for request/response validation
- [AI Elements](https://ai-elements.dev/) (Conversation, Message, PromptInput) for the chat UI
- NewsAPI (free tier) for article retrieval

## Models

Set in `src/app/api/summarize/route.ts` and `src/app/api/chat/route.ts`:

- Summarize: **`claude-haiku-4-5-20251001`** — cheapest current Haiku, plenty for short structured summaries.
- Chat: same model. `maxOutputTokens: 350` and a brevity-enforcing system prompt to keep responses tight.

GPT-4o (`@ai-sdk/openai`) is wired in the route handlers but the toggle is hidden in the UI — add `OPENAI_API_KEY` to `.env.local` and re-add the toggle in `SearchForm.tsx` if you want it back.

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Create `.env.local` in the project root:

```bash
ANTHROPIC_API_KEY=sk-ant-...
NEWS_API_KEY=...                # free at https://newsapi.org/
# OPENAI_API_KEY=sk-...         # optional — only if you re-enable GPT
```

`.env.local` is gitignored.

### 3. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start Next.js dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── summarize/route.ts   # custom SSE — articles, then streamed object deltas
│   │   └── chat/
│   │       ├── route.ts         # grounded chat with tool support scaffolded
│   │       └── tools.ts         # empty ToolSet — drop tools in here
│   ├── icon.svg                 # favicon
│   ├── layout.tsx
│   ├── page.tsx                 # composes the landing page + manages SSE state
│   └── globals.css
├── components/
│   ├── ai-elements/             # CLI-installed Conversation/Message/PromptInput
│   ├── ui/                      # CLI-installed shadcn primitives
│   ├── Chat.tsx                 # useChat + ai-elements wiring
│   ├── LanguageToggle.tsx
│   ├── NewsCard.tsx
│   ├── NewsFeed.tsx
│   ├── SearchForm.tsx           # ticker input + popular dropdown
│   ├── SentimentBadge.tsx
│   └── SummarySection.tsx
└── lib/
    ├── i18n.ts                  # LanguageProvider + EN/ES dictionary + t()
    ├── recent-tickers.ts        # useRecentTickers — localStorage, last 5
    ├── tickers.ts               # POPULAR_TICKERS list for the dropdown
    ├── types.ts                 # shared types + Zod schemas
    └── utils.ts                 # cn() helper
```

## How the streaming works

### `/api/summarize`

Custom Server-Sent Events with three message types:

1. `{ type: "articles", data: NewsArticle[] }` — fired first so the news feed populates immediately while the model is still thinking.
2. `{ type: "object", data: PartialSummary }` — every partial object delta from `streamText({ output: Output.object({ schema }) })`. The UI re-renders as fields fill in.
3. `{ type: "done" }` — terminator.
4. `{ type: "error", data: string }` — on validation, fetch, or model errors.

### `/api/chat`

Uses the Vercel AI SDK's UI message stream protocol via `result.toUIMessageStreamResponse()`. The client uses `useChat()` from `@ai-sdk/react` and passes the current `provider`, `language`, `ticker`, `articles`, and `summary` to `sendMessage` so the server can inject them into the system prompt for every turn.

## Adding tools to the chat

Drop them into `src/app/api/chat/tools.ts`:

```ts
import { tool, type ToolSet } from "ai";
import { z } from "zod";

export const chatTools = {
  analyzeTicker: tool({
    description: "Pull news + summary for a different ticker.",
    inputSchema: z.object({ ticker: z.string() }),
    execute: async ({ ticker }) => {
      // ...
    },
  }),
} satisfies ToolSet;
```

The route handler auto-registers everything in `chatTools` — no other wiring needed on the server. To render tool output in the chat UI, add a case for `tool-<name>` in `src/components/Chat.tsx` next to the existing `text` case.

## Notes

- `AGENTS.md` flags that this is Next 16, not Next 15 — APIs and conventions can differ from older training data. The route handler async-param pattern is honored throughout.
- `.pnp.cjs` warnings during lint are from yarn's PnP cache, not project code — safe to ignore.
- The AI Elements + shadcn primitives are CLI-generated and excluded from ESLint (`eslint.config.mjs`) so their internal patterns don't gate the suite.
