import type { Metadata } from "next";
import Link from "next/link";

import { REPO_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy & disclaimer",
  description: `How ${SITE_NAME} handles data, cookies and AI-generated content.`,
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-11-17";

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 text-sm leading-relaxed text-zinc-300 sm:px-6">
      <Link href="/" className="text-emerald-300 hover:underline">
        ← {SITE_NAME}
      </Link>

      <article lang="en" className="mt-8 space-y-4">
        <h1 className="text-3xl font-semibold text-zinc-50">Privacy & disclaimer</h1>
        <p className="text-xs text-zinc-500">Last updated: {UPDATED}</p>

        <h2 className="pt-4 text-lg font-semibold text-zinc-100">Not financial advice</h2>
        <p>
          {SITE_NAME} is a free educational project. Summaries, sentiment labels
          and chat answers are generated automatically by an AI model (Anthropic
          Claude) from third-party news and may be incomplete, outdated or wrong.
          Nothing on this site is investment, legal or tax advice, or a
          recommendation to buy, sell or hold any security or crypto-asset.
          Always check the original sources and consult a licensed professional
          before making financial decisions.
        </p>

        <h2 className="pt-4 text-lg font-semibold text-zinc-100">News content</h2>
        <p>
          Headlines, short summaries and thumbnails are retrieved from
          Finnhub.io. Articles remain the property of their publishers; we show
          only the headline, a short excerpt, the source name, the publisher’s
          thumbnail and a link to the original. Thumbnails load directly from
          the publisher’s server, which receives a standard image request
          from your browser (no referrer is sent).
        </p>

        <h2 className="pt-4 text-lg font-semibold text-zinc-100">What data we process</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Tickers and chat messages</strong> you submit are sent to our
            server and to the AI provider (Anthropic) to generate a response.
            We do not store them in a database. Do not enter personal or
            sensitive information in the chat.
          </li>
          <li>
            <strong>Your browser</strong> stores your language, last five tickers
            and cookie choice in localStorage. This never leaves your device.
          </li>
          <li>
            <strong>Server logs</strong> (IP address, timestamps, errors) are kept
            by our host, Vercel, for security and rate limiting.
          </li>
          <li>
            <strong>Analytics</strong>: only if you accept, Google Analytics 4
            sets cookies to measure anonymous usage (pages viewed, tickers
            analyzed). You can withdraw consent at any time with “Cookie
            settings” in the footer.
          </li>
        </ul>

        <h2 className="pt-4 text-lg font-semibold text-zinc-100">Contact</h2>
        <p>
          Questions or removal requests: open an issue on{" "}
          <a href={REPO_URL} className="text-emerald-300 hover:underline">
            GitHub
          </a>
          .
        </p>
      </article>

      <article lang="es" className="mt-12 space-y-4 border-t border-zinc-800 pt-10">
        <h2 className="text-2xl font-semibold text-zinc-50">Privacidad y aviso legal</h2>
        <p>
          {SITE_NAME} es un proyecto educativo gratuito. Los resúmenes, etiquetas
          de sentimiento y respuestas del chat los genera automáticamente una IA
          (Claude de Anthropic) a partir de noticias de terceros y pueden ser
          incompletos o incorrectos. <strong>Nada de lo publicado constituye
          asesoría financiera</strong> ni una recomendación de comprar, vender o
          mantener valores o criptoactivos.
        </p>
        <p>
          Las noticias provienen de Finnhub.io y pertenecen a sus medios. Los
          tickers y mensajes que envías se procesan en nuestro servidor y en
          Anthropic para generar la respuesta, sin guardarse en una base de datos.
          Tu idioma, tickers recientes y preferencia de cookies se guardan solo
          en tu navegador. Google Analytics se activa únicamente si lo aceptas y
          puedes revocarlo en “Configurar cookies”.
        </p>
      </article>
    </main>
  );
}
