# Deployment and operations

The app runs on Vercel. Every push to a branch creates a preview deployment; `main` deploys to production at https://fintech-summarizer.vercel.app.

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

Set them for **Production** and **Preview**.

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | From console.anthropic.com → API keys |
| `FINNHUB_API_KEY` | yes | Free at finnhub.io → Dashboard. Free plan: 60 calls/min, personal use |
| `ANTHROPIC_MODEL` | no | Default `claude-haiku-5-5`. Set `claude-haiku-4-5-20251001` to roll back without a code change |
| `NEXT_PUBLIC_GA_ID` | no | GA4 measurement ID. **Build-time**: redeploy after setting it |
| `NEXT_PUBLIC_SITE_URL` | no | Only after attaching a custom domain. **Build-time** |
| `NEWS_API_KEY` | — | No longer used; delete it from Vercel |

Server-only variables (`ANTHROPIC_*`, `FINNHUB_*`) apply to the next request after a redeploy. `NEXT_PUBLIC_*` variables are inlined at build time, so they always need a redeploy.

## 2. First deploy checklist

1. Add `ANTHROPIC_API_KEY` and `FINNHUB_API_KEY` (and remove `NEWS_API_KEY`).
2. Redeploy, open the preview and try a stock (`AAPL`, `NVDA`), a coin (`BTC`, `SOL`) and an unknown symbol.
3. Smoke-test the deployment with the E2E suite (it mocks the API, so it checks the UI, SEO files and headers of the real deploy):
   ```bash
   E2E_BASE_URL=https://<preview-url> npm run test:e2e
   ```
4. In the Anthropic console, set a **monthly spend limit** (Settings → Limits). It is the only hard cap on AI cost.
5. Merge to `main`.

## 3. Google Analytics 4

1. analytics.google.com → Admin → **Create property** → time zone and currency → **Web** data stream with the site URL. Copy the measurement ID (`G-XXXXXXXXXX`).
2. Vercel → `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` → redeploy.
3. Open the site: the cookie banner appears. Accept, then check **Reports → Realtime** in GA.
4. Optional: in GA, Admin → Events, mark `analyze_ticker` as a key event.

Events sent: `page_view` (automatic), `analyze_ticker`, `analyze_error`, `chat_message`. Nothing is sent until the visitor accepts; "Cookie settings" in the footer resets the choice.

## 4. Custom domain (later)

1. Buy the domain and add it in Vercel → Settings → Domains (follow the DNS records it shows).
2. Set `NEXT_PUBLIC_SITE_URL=https://your-domain` and redeploy. Canonical URLs, Open Graph, the sitemap, robots and JSON-LD all read it from `src/lib/site.ts`.
3. Update the URLs in `public/llms.txt` and the README.
4. In Vercel, redirect `fintech-summarizer.vercel.app` to the new domain.
5. Google Search Console and Bing Webmaster Tools: verify the domain, submit `https://your-domain/sitemap.xml`. Bing also feeds ChatGPT search and Copilot.

## 5. Operations

| Task | How |
|---|---|
| Check what the model receives / errors | Vercel → Logs; routes log with the `[summarize]`, `[chat]` and `[news]` prefixes |
| Too many 429s from Finnhub | Free plan is 60 calls/min. Add caching of news per ticker (e.g. 5 min) or upgrade |
| Global rate limit | Swap the `Map` in `src/lib/rate-limit.ts` for Upstash Redis (free tier) behind the same interface |
| Change model | `ANTHROPIC_MODEL` env var, redeploy |
| Dependency updates | `npm outdated`, update, then `npm run lint && npm run typecheck && npm run test:coverage && npm run build && npm run test:e2e` |

## 6. CI

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests: `npm ci` → lint → typecheck → unit/integration tests with the 95% coverage gate → build → Playwright E2E (Chromium). It needs no secrets because no test calls Anthropic or Finnhub. On failure the Playwright HTML report is uploaded as an artifact.
