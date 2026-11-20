# Auditoría técnica — Fintech Summarizer

Fecha: 2026-11-17 · Sitio auditado: https://fintech-summarizer.vercel.app (último deploy hace ~6 meses, según el header `age` de Vercel).
Método: scraping HTTP del sitio en vivo, llamadas reales a las APIs de producción, capturas con Playwright (escritorio 1440px + iPhone 13), axe-core, `npm audit`, búsqueda de secretos en todo el historial de git y revisión del código.

## Veredicto

La app funciona: el resumen llega en ~7 s, el streaming va bien y el diseño es limpio. Pero no estaba lista para mostrarse en un CV: tenía vulnerabilidades críticas en dependencias, un endpoint de IA abierto sin límites, noticias irrelevantes de un proveedor cuyo plan gratuito prohíbe producción, se presentaba como "asesor financiero" sin ningún aviso legal, y no tenía SEO, tests ni CI.

**Estado actual (rama `claude/project-audit-deployment-ol9j64`):** todos los hallazgos de la tabla están resueltos en código. Lo que falta es operativo (claves en Vercel, GA, dominio); ver "Pendientes". Arquitectura: [ARCHITECTURE.md](ARCHITECTURE.md) · Despliegue: [DEPLOYMENT.md](DEPLOYMENT.md).

## Hallazgos en producción (antes)

| # | Severidad | Hallazgo | Evidencia | Estado |
|---|---|---|---|---|
| 1 | Crítica | Next 16.2.6 con advisories críticos (bypass de middleware, DoS) + 5 altos (postcss, sharp, zod, nanoid, dompurify) | `npm audit`: 2 critical, 5 high | ✅ Next 16.4.6 + `audit fix` → solo 8 low (katex transitivo) |
| 2 | Alta | APIs sin rate limit ni control de origen: cualquiera puede gastar tu crédito de Anthropic con un script | `curl` directo a `/api/chat` responde | ✅ Límite por IP (10/min resumen, 20/min chat), chequeo same-origin, esquemas acotados |
| 3 | Alta (legal) | El chat se llama "Financial advisor" y el modelo ofrecía "financial advice"; no hay disclaimer en ninguna parte | Respuesta real: *"If you'd like financial advice, I'm ready to help"* | ✅ Rol de asistente educativo, prohibido recomendar comprar/vender/mantener, disclaimer en resumen + footer + `/privacy` |
| 4 | Alta (producto + legal) | Noticias irrelevantes (3 de 5 resultados para AAPL eran paquetes de PyPI; JPM traía la bolsa india) y NewsAPI gratuito prohíbe producción | Respuesta real de `/api/summarize`; términos de NewsAPI | ✅ Migrado a **Finnhub**: noticias etiquetadas con el símbolo exacto (acciones) y feed cripto filtrado por moneda |
| 5 | Media | Enlaces rotos: URLs con `&amp;` sin decodificar (`?op=view&amp;id=…`) | Enlaces de Slashdot en las tarjetas | ✅ Entidades decodificadas; solo se aceptan URLs `http(s)` (bloquea `javascript:`) |
| 6 | Media | Los errores filtran detalles internos (`"NEWS_API_KEY is not configured"`, `details: err.message`) | `/api/summarize` con `provider:openai` → `OPENAI_API_KEY is not configured` | ✅ Mensajes genéricos al cliente, el detalle va a los logs |
| 7 | Media | La API key de noticias va en la query string (termina en logs) | `route.ts` | ✅ Token en header (`X-Finnhub-Token`) |
| 8 | Media | Inyección de prompt: el texto de los artículos (de terceros) entraba al prompt sin delimitar | `buildPrompt` | ✅ Artículos dentro de `<articles>`, con `<>` escapados y marcados como datos no confiables |
| 9 | Media (SEO) | Sin `robots.txt`, `sitemap.xml`, OG image, canonical, JSON-LD ni `favicon.ico`: todo da 404 | Scraping | ✅ Todo implementado, más `llms.txt` y `manifest` |
| 10 | Media (a11y) | axe: `scrollable-region-focusable` (serio) en las 5 tarjetas de noticias | axe-core en producción | ✅ `line-clamp` en lugar de scroll interno; axe WCAG 2.1 AA en verde en CI |
| 11 | Media (visual) | En móvil, los "Key insights" quedan cortados por la altura fija de 34rem; el estado vacío muestra paneles grandes y vacíos | Capturas | ✅ Altura fija solo en escritorio; los paneles aparecen tras la primera búsqueda |
| 12 | Baja | Sin footer, autor, enlace al repo ni contacto | Capturas | ✅ Footer con autor, código fuente, privacidad y configuración de cookies |
| 13 | Baja | El idioma no persiste y `<html lang>` siempre es `en` | Código | ✅ Persistido en localStorage y sincronizado |
| 14 | Baja | Sin headers de seguridad (`X-Frame-Options`, `Referrer-Policy`…), `x-powered-by` expuesto | `curl -I` | ✅ Agregados |
| 15 | Baja | Dos lockfiles (`yarn.lock` + `package-lock.json`) y `packageManager: yarn@4`: builds no deterministas | Repo | ✅ Solo npm |
| 16 | Info | Cero tests, cero CI | Repo | ✅ 91 tests unitarios/integración (99,8% de líneas) + 22 E2E + GitHub Actions |
| 17 | Media (visual) | Los componentes del chat usaban tokens de tema (`bg-secondary`, `bg-primary`, `text-muted-foreground`…) que nunca se definieron: la burbuja del usuario y el botón de enviar salían sin estilo | Capturas del chat | ✅ Tokens definidos en `globals.css` |
| 18 | Baja (visual) | Grilla de noticias con huecos (5 tarjetas en 3 columnas) y tarjetas de alturas distintas; menú "Popular" semitransparente y fuera de pantalla en móvil; placeholder cortado; áreas táctiles de 20px | Auditoría visual 375–1920px | ✅ Ver sección "Auditoría visual" |

Sin problemas: no hay secretos en el código ni en el historial de git (solo el placeholder `sk-ant-...` del README), `.env*` está en `.gitignore`, HTTPS + HSTS preload están activos (Vercel), la validación con Zod funciona, no hay errores de consola y no hay scroll horizontal.

## Prompts (antes → después)

- **Rol**: "experienced financial advisor" → asistente educativo; "no eres asesor financiero, nunca digas comprar/vender/mantener, ni precios objetivo".
- **Fecha**: el modelo no sabía qué día era → se inyecta la fecha de hoy.
- **Relevancia**: "usa SOLO estos artículos" (aunque fueran de PyPI) → "ignora los resultados que no traten del ticker; si hay menos de 2 relevantes, dilo".
- **Seguridad**: el texto de terceros se mezclaba con las instrucciones → va delimitado y declarado como dato no confiable.
- **Alcance**: rechaza pedidos ajenos a finanzas (antes ya lo hacía, ahora queda explícito).
- **Modelo**: ahora `claude-haiku-5-5` por defecto ($0,10 / $0,50 por millón de tokens frente a $1 / $5 de Haiku 4.5), con `effort: "low"`. Haiku 5.5 "piensa" por defecto y estas tareas cortas no lo necesitan. Para volver atrás: `ANTHROPIC_MODEL=claude-haiku-4-5-20251001`.

## Legal: de dónde vienen los datos

- **Antes, NewsAPI.org**: el plan gratuito *Developer* es solo para desarrollo y prohíbe staging y producción. Resuelto migrando a Finnhub.
- **Ahora, Finnhub**: plan gratuito de 60 llamadas por minuto con licencia de "uso personal", lo que encaja con una demo de portafolio sin fines de lucro. Si la app se monetiza, habría que contratar un plan comercial. Las noticias de empresas cubren compañías norteamericanas; para cripto no hay endpoint por moneda, así que se filtra el feed cripto. Conviene leer los términos vigentes de Finnhub antes de publicar.
- **Contenido de terceros**: solo se muestran titular, extracto, medio, miniatura del medio y enlace al original. Queda atribuido en el footer y en `/privacy`.
- **Datos personales**: no hay cuentas ni base de datos. GA4 solo se carga con consentimiento explícito (banner, revocable). La política de privacidad está en `/privacy` (EN/ES). Las miniaturas se cargan desde el servidor del medio sin enviar referrer. Esto no es asesoría legal.

## Google Analytics: cómo activarlo

1. Crea una propiedad GA4 en analytics.google.com → Admin → Data streams → Web → copia el `G-XXXXXXX`.
2. En Vercel → Settings → Environment Variables agrega `NEXT_PUBLIC_GA_ID=G-XXXXXXX` (Production y Preview) y vuelve a desplegar.
3. Desde ese momento aparece el banner; tras aceptar se envían `page_view`, `analyze_ticker`, `analyze_error` y `chat_message`.
4. Opcional: Vercel Analytics / Speed Insights para Core Web Vitals sin cookies.

## Pendientes (ordenados por prioridad)

1. ✅ `FINNHUB_API_KEY` agregada en Vercel. Opcional: borrar la variable antigua `NEWS_API_KEY`.
2. **Validar en el preview** con tu clave: AAPL, NVDA, JPM, BTC, SOL y un símbolo desconocido. El cliente de Finnhub se probó con datos simulados del formato documentado, no contra la API real, porque aquí no hay clave.
3. **Revisar Haiku 5.5 en el preview** (latencia y calidad). Para volver atrás: `ANTHROPIC_MODEL=claude-haiku-4-5-20251001`.
4. **Límite de gasto mensual** en la consola de Anthropic (5 minutos, el único tope duro de costo).
5. ✅ **Dominio**: `nicobermudez.com` (Cloudflare) → `fintech.nicobermudez.com` en Vercel, CNAME sin proxy, `fintech-summarizer.vercel.app` redirige con 308.
6. **Pendiente — Search Console y Bing** (paso 6 de [DEPLOYMENT.md §4](DEPLOYMENT.md#4-custom-domain-cloudflare-dns--vercel)): propiedad de dominio `nicobermudez.com` con registro TXT en Cloudflare y envío de `https://fintech.nicobermudez.com/sitemap.xml`; luego importar en Bing Webmaster Tools.
7. **Pendiente — Google Analytics**: crear la propiedad GA4 con la URL `https://fintech.nicobermudez.com`, poner `NEXT_PUBLIC_GA_ID` en Vercel y volver a desplegar ([DEPLOYMENT.md §3](DEPLOYMENT.md#3-google-analytics-4)).
8. **Más adelante**: límite de uso global con Upstash; caché de noticias por ticker (cuida el límite de 60/min de Finnhub); CSP con nonces; citas `[1]`, `[2]` por punto clave.

## Auditoría visual (2026-11-17)

Capturas automáticas en 375, 390, 768, 1024, 1440 y 1920 px, en los estados: banner de cookies, menú "Popular", resultado con imágenes, chat con mensajes y español. Se midió el desborde horizontal y el tamaño de cada elemento interactivo.

| Problema | Arreglo |
|---|---|
| Burbuja del usuario y botón de enviar sin estilo | Tokens de tema shadcn/AI Elements en `globals.css` |
| 5 tarjetas en 3 columnas dejaban un hueco; tarjetas sin imagen desalineadas | Primera tarjeta destacada (ocupa 2 columnas cuando hay 2 o 5 artículos); placeholder cuando otras tienen imagen |
| Panel de resumen de altura fija con espacio muerto; chat vacío muy alto | El resumen define la altura de la fila y el chat la iguala |
| El resumen (lo principal) quedaba debajo de las 5 noticias en móvil | Resumen + chat primero, fuentes debajo |
| Imágenes 16:9 alargaban mucho la página en móvil | 21:9 en móvil, 16:9 desde `sm` |
| Menú "Popular" semitransparente (se leía el texto de atrás) y más alto que la pantalla | Fondo opaco, alto máximo 60vh con scroll |
| Placeholder "Ticker: AAPL, TSLA, B…" cortado en móvil | "e.g. AAPL, NVDA, BTC" |
| Preguntas del FAQ y enlaces del footer con 20px de alto | ≥44px en móvil, ≥24px desde `sm` |

Resultado: 0 px de desborde en todos los anchos, ningún elemento interactivo bajo 24px (salvo el enlace en línea del banner, exento por WCAG 2.5.8) y axe WCAG 2.1 AA sin violaciones en escritorio y móvil.

## Propuestas visuales (no implementadas)

- **Hero con demo**: un GIF o vídeo corto del streaming arriba del pliegue. Un reclutador entiende el producto en 3 s sin tener que escribir un ticker.
- **Tickers sugeridos como chips** bajo el buscador (AAPL · NVDA · BTC) en vez de esconderlos en "Popular": un clic para ver la app en acción.
- **Citas por insight**: enlazar cada punto clave al artículo de origen (también mejora la confianza y el disclaimer).
- **Mini gráfico de precio** (sparkline de 5 días) junto al sentimiento; requiere una API de precios.
- **Sección "Sobre el proyecto"** con el stack, la arquitectura (diagrama SSE) y un enlace a tu LinkedIn: para un portafolio, el *cómo* importa tanto como el *qué*.

## Cómo verificar

```bash
npm ci
npm run lint && npm run typecheck
npm run test:coverage        # 91 tests, gate 95%
npm run build && npm run test:e2e   # 22 tests (desktop + mobile)
E2E_BASE_URL=https://<preview>.vercel.app npm run test:e2e   # contra un deploy
```
