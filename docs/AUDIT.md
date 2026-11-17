# Auditoría técnica — Fintech Summarizer

Fecha: 2026-11-17 · Sitio auditado: https://fintech-summarizer.vercel.app (último deploy hace ~6 meses, según el header `age` de Vercel).
Método: scraping HTTP del sitio en vivo, llamadas reales a las APIs de producción, capturas con Playwright (escritorio 1440px + iPhone 13), axe-core, `npm audit`, búsqueda de secretos en todo el historial de git y revisión del código.

## Veredicto

La app funciona: el resumen llega en ~7 s, el streaming va bien y el diseño es limpio. Pero no estaba lista para mostrarse en un CV: tenía vulnerabilidades críticas en dependencias, un endpoint de IA abierto sin límites, noticias irrelevantes, se presentaba como "asesor financiero" sin ningún aviso legal, y no tenía SEO, tests ni CI.

## Hallazgos en producción (antes)

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| 1 | Crítica | Next 16.2.6 con advisories críticos (bypass de middleware, DoS) + 5 altos (postcss, sharp, zod, nanoid, dompurify) | `npm audit`: 2 critical, 5 high | ✅ Next 16.4.6 + `audit fix` → solo 8 low (katex transitivo) |
| 2 | Alta | APIs sin rate limit ni control de origen: cualquiera puede gastar tu crédito de Anthropic con un script | `curl` directo a `/api/chat` responde | ✅ Límite por IP (10/min resumen, 20/min chat), chequeo same-origin, esquemas acotados |
| 3 | Alta (legal) | El chat se llama "Financial advisor" y el modelo ofrecía "financial advice"; no hay disclaimer en ninguna parte | Respuesta real: *"If you'd like financial advice, I'm ready to help"* | ✅ Rol de asistente educativo, prohibido recomendar comprar/vender/mantener, disclaimer en resumen + footer + `/privacy` |
| 4 | Alta (producto) | Noticias irrelevantes: 3 de 5 resultados para AAPL eran paquetes de PyPI; JPM traía noticias de la bolsa india | Respuesta real de `/api/summarize` | ✅ Búsqueda por símbolo + nombre de la empresa + términos financieros, se excluyen pypi/github/slashdot (validar en preview, ver pendientes) |
| 5 | Media | Enlaces rotos: URLs con `&amp;` sin decodificar (`?op=view&amp;id=…`) | Enlaces de Slashdot en las tarjetas | ✅ Entidades decodificadas; solo se aceptan URLs `http(s)` (bloquea `javascript:`) |
| 6 | Media | Los errores filtran detalles internos (`"NEWS_API_KEY is not configured"`, `details: err.message`) | `/api/summarize` con `provider:openai` → `OPENAI_API_KEY is not configured` | ✅ Mensajes genéricos al cliente, el detalle va a los logs |
| 7 | Media | La API key de NewsAPI va en la query string (termina en logs) | `route.ts` | ✅ Header `X-Api-Key` |
| 8 | Media | Inyección de prompt: el texto de los artículos (de terceros) entraba al prompt sin delimitar | `buildPrompt` | ✅ Artículos dentro de `<articles>`, con `<>` escapados y marcados como datos no confiables |
| 9 | Media (SEO) | Sin `robots.txt`, `sitemap.xml`, OG image, canonical, JSON-LD ni `favicon.ico`: todo da 404 | Scraping | ✅ Todo implementado, más `llms.txt` y `manifest` |
| 10 | Media (a11y) | axe: `scrollable-region-focusable` (serio) en las 5 tarjetas de noticias | axe-core en producción | ✅ `line-clamp` en lugar de scroll interno; axe WCAG 2.1 AA en verde en CI |
| 11 | Media (visual) | En móvil, los "Key insights" quedan cortados por la altura fija de 34rem; el estado vacío muestra paneles grandes y vacíos | Capturas | ✅ Altura fija solo en escritorio; los paneles aparecen tras la primera búsqueda |
| 12 | Baja | Sin footer, autor, enlace al repo ni contacto | Capturas | ✅ Footer con autor, código fuente, privacidad y configuración de cookies |
| 13 | Baja | El idioma no persiste y `<html lang>` siempre es `en` | Código | ✅ Persistido en localStorage y sincronizado |
| 14 | Baja | Sin headers de seguridad (`X-Frame-Options`, `Referrer-Policy`…), `x-powered-by` expuesto | `curl -I` | ✅ Agregados |
| 15 | Baja | Dos lockfiles (`yarn.lock` + `package-lock.json`) y `packageManager: yarn@4`: builds no deterministas | Repo | ✅ Solo npm |
| 16 | Info | Cero tests, cero CI | Repo | ✅ 88 tests unitarios/integración (99,8% de cobertura) + 22 E2E + GitHub Actions |

Sin problemas: no hay secretos en el código ni en el historial de git (solo el placeholder `sk-ant-...` del README), `.env*` está en `.gitignore`, HTTPS + HSTS preload están activos (Vercel), la validación con Zod funciona, no hay errores de consola y no hay scroll horizontal.

## Prompts (antes → después)

- **Rol**: "experienced financial advisor" → asistente educativo; "no eres asesor financiero, nunca digas comprar/vender/mantener, ni precios objetivo".
- **Fecha**: el modelo no sabía qué día era → se inyecta la fecha de hoy.
- **Relevancia**: "usa SOLO estos artículos" (aunque fueran de PyPI) → "ignora los resultados que no traten del ticker; si hay menos de 2 relevantes, dilo".
- **Seguridad**: el texto de terceros se mezclaba con las instrucciones → va delimitado y declarado como dato no confiable.
- **Alcance**: rechaza pedidos ajenos a finanzas (antes ya lo hacía, ahora queda explícito).
- **Modelo**: ahora `claude-haiku-5-5` por defecto ($0,10 / $0,50 por millón de tokens frente a $1 / $5 de Haiku 4.5), con `effort: "low"`. Haiku 5.5 "piensa" por defecto y estas tareas cortas no lo necesitan. Para volver atrás: `ANTHROPIC_MODEL=claude-haiku-4-5-20251001`.

## Legal: de dónde vienen los datos

- **NewsAPI.org**: el plan gratuito *Developer* es **solo para desarrollo**; sus términos no permiten usarlo en producción. **Este es el riesgo legal más importante que queda abierto.** Opciones: (a) plan pago de NewsAPI; (b) migrar a una API con plan gratuito que permita producción y noticias por ticker (Finnhub *company-news*, Marketaux, Alpha Vantage *NEWS_SENTIMENT*); revisa los términos vigentes de cada una antes de elegir.
- **Contenido de terceros**: solo se muestran titular, extracto, medio y enlace al original, lo que está en línea con el uso habitual de agregadores. Queda atribuido en el footer.
- **Datos personales**: no hay cuentas ni base de datos. GA4 se carga solo con consentimiento explícito (banner, revocable). La política de privacidad está en `/privacy` (EN/ES). Esto cubre lo básico para el GDPR y la ley chilena 21.719 en una demo; no es asesoría legal.

## Google Analytics: cómo activarlo

1. Crea una propiedad GA4 en analytics.google.com → Admin → Data streams → Web → copia el `G-XXXXXXX`.
2. En Vercel → Settings → Environment Variables agrega `NEXT_PUBLIC_GA_ID=G-XXXXXXX` (Production y Preview) y vuelve a desplegar.
3. Desde ese momento aparece el banner; tras aceptar se envían `page_view`, `analyze_ticker`, `analyze_error` y `chat_message`.
4. Opcional: Vercel Analytics / Speed Insights para Core Web Vitals sin cookies.

## Pendientes (ordenados por prioridad)

1. **Dar acceso de push a GitHub** y abrir un PR desde `claude/project-audit-deployment-ol9j64`; revisar el deploy de preview de Vercel.
2. **Validar en el preview** la nueva búsqueda de noticias con tickers reales (AAPL, JPM, BTC, SOL). No se pudo probar contra NewsAPI desde aquí: no hay clave y el host está bloqueado.
3. **Resolver la licencia de NewsAPI** (ver la sección Legal).
4. **Dominio propio** (~10 USD/año) y luego `NEXT_PUBLIC_SITE_URL`. Sin dominio, `*.vercel.app` posiciona mal y no se puede verificar en Search Console por DNS (sí por archivo HTML/meta tag).
5. **Google Search Console + Bing Webmaster**: enviar `sitemap.xml`. Bing alimenta a ChatGPT Search y Copilot, así que importa para GEO.
6. **Rate limit global**: hoy vive en la memoria de cada instancia serverless. Para un tope real, Upstash Redis (tiene plan gratuito) detrás de la misma interfaz. Pon también un límite de gasto mensual en la consola de Anthropic.
7. **CSP con nonces** (en `next.config.ts` está anotado por qué quedó fuera).
8. ~~Probar `claude-haiku-5-5`~~ → ya es el modelo por defecto; revisar latencia y calidad en el preview.
9. **Comparar el sentimiento**: el mismo NVDA dio NEUTRAL en escritorio y BEARISH en móvil con segundos de diferencia. Considera mostrar en qué artículos se apoya cada punto clave (citas `[1]`, `[2]`) para dar confianza.

## Propuestas visuales (no implementadas)

- **Hero con demo**: un GIF o vídeo corto del streaming arriba del pliegue. Un reclutador entiende el producto en 3 s sin tener que escribir un ticker.
- **Tickers sugeridos como chips** bajo el buscador (AAPL · NVDA · BTC) en vez de esconderlos en "Popular": un clic para ver la app en acción.
- **Citas por insight**: enlazar cada punto clave al artículo de origen (también mejora la confianza y el disclaimer).
- **Mini gráfico de precio** (sparkline de 5 días) junto al sentimiento; requiere una API de precios.
- **Estado vacío del chat** más corto en móvil (hoy ocupa ~28rem vacías); en escritorio el panel de resumen deja espacio libre si el texto es corto.
- **Sección "Sobre el proyecto"** con el stack, la arquitectura (diagrama SSE) y un enlace a tu LinkedIn: para un portafolio, el *cómo* importa tanto como el *qué*.

## Cómo verificar

```bash
npm ci
npm run lint && npm run typecheck
npm run test:coverage        # 88 tests, gate 95%
npm run build && npm run test:e2e   # 22 tests (desktop + mobile)
E2E_BASE_URL=https://<preview>.vercel.app npm run test:e2e   # contra un deploy
```
