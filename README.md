# Fintech Summarizer

AI-powered market briefings. Type a stock or crypto ticker and get the latest 5 news articles plus a streaming, structured summary written by Claude — with a grounded chat for follow-up questions.

Project 1 of an AI Engineering roadmap, built on Next.js 16 + Vercel AI SDK v6.

## 🚀 Live Demo

**[https://fintech-summarizer.vercel.app/](https://fintech-summarizer.vercel.app/)**

## Features

- **Live news feed** — last 5 articles for any ticker, fetched from NewsAPI.
- **Streaming AI summary** — `streamText` + `Output.object({ schema })` produces a typed object as it streams: headline, market overview, three key insights, sentiment (BULLISH / BEARISH / NEUTRAL).
- **Grounded chat** — an educational assistant that answers questions about the loaded articles + summary. It will not invent facts, never gives buy/sell/hold advice, and treats article text as untrusted data (prompt-injection hardening).
- **EN / ES toggle** — switches all UI strings and tells the model to respond in Spanish or English.
- **Popular ticker dropdown** — curated list of common stocks and crypto with company names, so you don't have to remember symbols.
- **Search history** — last 5 tickers persisted in `localStorage`; one click to re-run the analysis.
- **Dark fintech theme** — Tailwind v4, lucide icons, AI Elements primitives for the chat.
- **Production hardening** — per-IP rate limiting, same-origin checks, bounded request schemas, generic error messages, security headers.
- **SEO + GEO** — metadata, Open Graph image, `robots.txt` (explicitly allows AI crawlers), `sitemap.xml`, `manifest`, `llms.txt`, JSON-LD (`WebApplication` + `FAQPage`) and crawlable "How it works"/FAQ copy.
- **Privacy-first analytics** — Google Analytics 4 loads only when `NEXT_PUBLIC_GA_ID` is set **and** the visitor accepts the cookie banner. Events: `analyze_ticker`, `analyze_error`, `chat_message`.
- **Legal** — "not financial advice" disclaimer in the summary, footer and `/privacy` page (EN/ES).

## Stack

- Next.js 16 (App Router, Turbopack) + React 19
- TypeScript strict, no `any`
- Tailwind CSS v4
- Vercel AI SDK v6 (`ai`, `@ai-sdk/anthropic`, `@ai-sdk/react`)
- Zod 4 for request/response validation
- [AI Elements](https://ai-elements.dev/) (Conversation, Message, PromptInput) for the chat UI
- NewsAPI (free tier) for article retrieval

## Models

Set in `src/lib/models.ts`; prompts live in `src/lib/prompts.ts`.

- Default: **`claude-haiku-5-5`** (current Haiku, $0.10 / $0.50 per million input/output tokens) for both summary and chat, with `effort: "low"` — Haiku 5.5 thinks adaptively by default and these short tasks don't need deep reasoning.
- Override per environment with `ANTHROPIC_MODEL` (e.g. `claude-haiku-4-5-20251001` to roll back). `effort` is only sent to Claude 5.x models, which accept it.

GPT-4o (`@ai-sdk/openai`) is wired in the route handlers but the toggle is hidden in the UI — add `OPENAI_API_KEY` to `.env.local` and re-add the toggle in `SearchForm.tsx` if you want it back.

## Getting Started

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in `ANTHROPIC_API_KEY` and `NEWS_API_KEY`. Optional: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_SITE_URL`, `ANTHROPIC_MODEL`. `.env.local` is gitignored.

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
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit + integration tests (Vitest, jsdom) |
| `npm run test:coverage` | Same, with the 95% coverage gate |
| `npm run test:e2e` | Playwright on desktop + mobile against `npm run build` output (API mocked; set `E2E_BASE_URL` to test a deployed URL) |

CI (`.github/workflows/ci.yml`) runs lint → typecheck → coverage → build → E2E on every push to `main` and every PR.

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
│   ├── layout.tsx               # metadata, OG, viewport
│   ├── page.tsx                 # server component: JSON-LD + <HomeApp/>
│   ├── privacy/page.tsx         # privacy & disclaimer (EN/ES)
│   ├── robots.ts · sitemap.ts · manifest.ts · opengraph-image.tsx
│   └── globals.css
├── components/
│   ├── ai-elements/             # CLI-installed Conversation/Message/PromptInput
│   ├── ui/                      # CLI-installed shadcn primitives
│   ├── HomeApp.tsx              # client app: search + SSE state, footer, consent, GA
│   ├── Analytics.tsx · ConsentBanner.tsx · Footer.tsx · InfoSections.tsx
│   ├── Chat.tsx                 # useChat + ai-elements wiring
│   ├── LanguageToggle.tsx
│   ├── NewsCard.tsx
│   ├── NewsFeed.tsx
│   ├── SearchForm.tsx           # ticker input + popular dropdown
│   ├── SentimentBadge.tsx
│   └── SummarySection.tsx
└── lib/
    ├── i18n.ts                  # LanguageProvider (persisted, sets <html lang>) + t()
    ├── translations.ts          # EN/ES dictionary (server-safe)
    ├── news.ts                  # NewsAPI query, URL sanitizing, normalization
    ├── prompts.ts               # summary + chat prompts
    ├── models.ts                # model selection (env override)
    ├── rate-limit.ts            # per-IP limiter + origin check
    ├── sse.ts                   # SSE encode/parse
    ├── consent.ts · analytics.ts · site.ts · structured-data.ts
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
- npm is the package manager (`package-lock.json`); the old `yarn.lock` was removed so Vercel and CI install the same tree.
- Rate limiting is in-memory per serverless instance. For a hard global limit, back `src/lib/rate-limit.ts` with Upstash Redis / Vercel KV.
- The AI Elements + shadcn primitives are CLI-generated and excluded from ESLint (`eslint.config.mjs`) so their internal patterns don't gate the suite.
