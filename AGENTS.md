<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project guide

Read `docs/ARCHITECTURE.md` before structural changes; `docs/DEPLOYMENT.md` covers env vars and operations.

## Commands

- `npm run lint && npm run typecheck` — must pass.
- `npm run test:coverage` — Vitest; 95% gate on lines/statements/functions/branches. Add tests with every change.
- `npm run build && npm run test:e2e` — Playwright against the production build (API mocked).

## Conventions

- Server logic lives in `src/lib/*` as pure, testable functions; route handlers stay thin. Route files may only export Next route fields (`POST`, `maxDuration`, …).
- All user-visible strings go in `src/lib/translations.ts` (EN and ES). It is a plain module so server code can read it; `i18n.ts` is the client provider.
- Validate every request body with the Zod schemas in `src/lib/types.ts`, and keep them bounded.
- Never expose provider errors or env var names to the client; log with a `[route]` prefix.
- Treat news text as untrusted data in prompts (see `src/lib/prompts.ts`). The assistant must never give buy/sell/hold advice.
- Model: `src/lib/models.ts` (default `claude-haiku-5-5`, `effort: "low"`). News: `src/lib/news.ts` (Finnhub).
- `src/components/ui` and `src/components/ai-elements` are CLI-vendored: avoid editing; they are excluded from lint and coverage. Their theme tokens live in `src/app/globals.css`.
- npm only (`package-lock.json`).
