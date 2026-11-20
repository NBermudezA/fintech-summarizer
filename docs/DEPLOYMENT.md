# Deployment and operations

The app runs on Vercel at **https://fintech.nicobermudez.com** (domain registered at Cloudflare, DNS on Cloudflare). Every push to a branch creates a preview deployment; `main` deploys to production. The old `fintech-summarizer.vercel.app` URL redirects to the custom domain.

## 1. Environment variables (Vercel → Project → Settings → Environment Variables)

Set them for **Production** and **Preview**.

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_PROD_KEY` | Production | Production-only Anthropic key with its own monthly spend limit. Used whenever it is set |
| `ANTHROPIC_API_KEY` | Development / Preview | Key for local dev and preview deployments (fallback when `ANTHROPIC_PROD_KEY` is unset) |
| `FINNHUB_API_KEY` | yes | Free at finnhub.io → Dashboard. Free plan: 60 calls/min, personal use |
| `ANTHROPIC_MODEL` | no | Default `claude-haiku-5-5`. Set `claude-haiku-4-5-20251001` to roll back without a code change |
| `NEXT_PUBLIC_GA_ID` | no | GA4 measurement ID. **Build-time**: redeploy after setting it |
| `NEXT_PUBLIC_SITE_URL` | no | Defaults to `https://fintech.nicobermudez.com`; set only to override. **Build-time** |
| `NEWS_API_KEY` | — | No longer used; delete it from Vercel |

Server-only variables (`ANTHROPIC_*`, `FINNHUB_*`) apply to the next request after a redeploy. `NEXT_PUBLIC_*` variables are inlined at build time, so they always need a redeploy.

## 2. First deploy checklist

1. Add `ANTHROPIC_PROD_KEY` (Production), `ANTHROPIC_API_KEY` (Development + Preview) and `FINNHUB_API_KEY`; remove `NEWS_API_KEY`.
2. Redeploy, open the preview and try a stock (`AAPL`, `NVDA`), a coin (`BTC`, `SOL`) and an unknown symbol.
3. Smoke-test the deployment with the E2E suite (it mocks the API, so it checks the UI, SEO files and headers of the real deploy):
   ```bash
   E2E_BASE_URL=https://<preview-url> npm run test:e2e
   ```
4. In the Anthropic console, keep a **monthly spend limit** on the production key's workspace (Settings → Limits). It is the only hard cap on AI cost.
5. Merge to `main`.

## 3. Google Analytics 4

1. analytics.google.com → Admin → **Create property** → time zone and currency → **Web** data stream with the site URL. Copy the measurement ID (`G-XXXXXXXXXX`).
2. Vercel → `NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX` → redeploy.
3. Open the site: the cookie banner appears. Accept, then check **Reports → Realtime** in GA.
4. Optional: in GA, Admin → Events, mark `analyze_ticker` as a key event.

Events sent: `page_view` (automatic), `analyze_ticker`, `analyze_error`, `chat_message`. Nothing is sent until the visitor accepts; "Cookie settings" in the footer resets the choice.

## 4. Custom domain (Cloudflare DNS → Vercel)

`nicobermudez.com` is registered at Cloudflare. The app lives on the `fintech` subdomain; the apex is reserved for a personal portfolio.

1. **Vercel** → project → Settings → **Domains** → Add `fintech.nicobermudez.com`. Vercel shows the DNS record it expects (a CNAME); copy its target exactly.
2. **Cloudflare** → `nicobermudez.com` → **DNS → Records → Add record**:
   - Type `CNAME`, Name `fintech`, Target: the value Vercel showed.
   - **Proxy status: DNS only (grey cloud).** With Cloudflare's proxy (orange cloud) in front, Vercel cannot issue and renew the TLS certificate reliably and two CDNs fight over caching.
3. Back in Vercel, wait until the domain shows **Valid Configuration** (usually minutes). Vercel issues the HTTPS certificate automatically.
4. In Vercel's domain list, edit `fintech-summarizer.vercel.app` and set it to **redirect** to `fintech.nicobermudez.com` (308), so only one URL is indexed.
5. Redeploy production (SITE_URL is inlined at build time) and check:
   ```bash
   curl -sI https://fintech.nicobermudez.com | head -1          # 200
   curl -s https://fintech.nicobermudez.com/robots.txt | tail -2   # Sitemap: https://fintech.nicobermudez.com/sitemap.xml
   E2E_BASE_URL=https://fintech.nicobermudez.com npm run test:e2e
   ```
6. **Google Search Console** → Add property → *Domain* `nicobermudez.com` → it gives a TXT record: add it in Cloudflare DNS (Cloudflare can also add it automatically) → Verify → Sitemaps → submit `https://fintech.nicobermudez.com/sitemap.xml`. Do the same in **Bing Webmaster Tools** (it can import from Search Console); Bing also feeds ChatGPT search and Copilot.
7. If a GA4 property exists, update its web stream URL to the new domain.

To move the app to another domain later, change `SITE_URL` in `src/lib/site.ts` (or set `NEXT_PUBLIC_SITE_URL`), update `public/llms.txt` and the README, and repeat the steps above.

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
