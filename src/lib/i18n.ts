"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Language = "en" | "es";

export const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en", label: "EN" },
  { value: "es", label: "ES" },
];

export const TRANSLATIONS = {
  en: {
    headerBadge: "AI-powered market briefings",
    appTitle: "Fintech Summarizer",
    appSubtitle:
      "Type any stock or crypto ticker and get the latest 5 articles plus a live, AI-generated market summary in seconds.",

    tickerPlaceholder: "Enter a ticker (AAPL, TSLA, BTC...)",
    tickerLabel: "Stock ticker symbol",
    providerLabel: "AI provider",
    analyze: "Analyze",
    analyzing: "Analyzing…",
    popularButton: "Popular",
    popularPanelLabel: "Popular tickers",
    stocksGroup: "Stocks",
    cryptoGroup: "Crypto",
    languageLabel: "Language",

    newsHeading: "Latest news",
    articleCountSingular: "1 article",
    articleCountPlural: "{count} articles",
    noArticles: "No articles found for {ticker}.",
    enterTicker: "Enter a ticker above to load the latest news.",

    summaryHeading: "AI summary",
    submitHint: "Submit a ticker above to generate a market summary.",
    keyInsights: "Key insights",

    sentimentAwaiting: "AWAITING",
    sentimentPositive: "BULLISH",
    sentimentNegative: "BEARISH",
    sentimentNeutral: "NEUTRAL",

    chatTitle: "Ask follow-up questions",
    chatBadge: "Financial advisor",
    chatEmptyTitleGrounded: "Ask about {ticker}",
    chatEmptyDescriptionGrounded:
      "Ask anything about the articles or summary above. Answers are grounded in what's loaded.",
    chatEmptyTitleUngrounded: "Ask a financial question",
    chatEmptyDescriptionUngrounded:
      "Pull a ticker above for grounded answers, or ask a general finance question.",
    chatPlaceholderGrounded: "Ask about {ticker}…",
    chatPlaceholderUngrounded: "Ask anything about finance…",
    chatInputLabel: "Chat input",
    sendLabel: "Send message",
    stopLabel: "Stop",
    chatErrorPrefix: "Chat error",

    readArticle: "Read article",
    requestFailed: "Request failed",
  },
  es: {
    headerBadge: "Resúmenes de mercado con IA",
    appTitle: "Fintech Summarizer",
    appSubtitle:
      "Escribe el ticker de cualquier acción o cripto y obtén las últimas 5 noticias junto con un resumen de mercado generado por IA en segundos.",

    tickerPlaceholder: "Ingresa un ticker (AAPL, TSLA, BTC...)",
    tickerLabel: "Símbolo bursátil",
    providerLabel: "Proveedor de IA",
    analyze: "Analizar",
    analyzing: "Analizando…",
    popularButton: "Populares",
    popularPanelLabel: "Tickers populares",
    stocksGroup: "Acciones",
    cryptoGroup: "Cripto",
    languageLabel: "Idioma",

    newsHeading: "Últimas noticias",
    articleCountSingular: "1 artículo",
    articleCountPlural: "{count} artículos",
    noArticles: "No se encontraron artículos para {ticker}.",
    enterTicker: "Ingresa un ticker arriba para cargar las últimas noticias.",

    summaryHeading: "Resumen IA",
    submitHint: "Envía un ticker arriba para generar un resumen del mercado.",
    keyInsights: "Puntos clave",

    sentimentAwaiting: "ESPERANDO",
    sentimentPositive: "ALCISTA",
    sentimentNegative: "BAJISTA",
    sentimentNeutral: "NEUTRAL",

    chatTitle: "Haz preguntas de seguimiento",
    chatBadge: "Asesor financiero",
    chatEmptyTitleGrounded: "Pregunta sobre {ticker}",
    chatEmptyDescriptionGrounded:
      "Pregunta cualquier cosa sobre los artículos o el resumen de arriba. Las respuestas están fundamentadas en lo cargado.",
    chatEmptyTitleUngrounded: "Haz una pregunta financiera",
    chatEmptyDescriptionUngrounded:
      "Carga un ticker arriba para respuestas fundamentadas, o haz una pregunta general de finanzas.",
    chatPlaceholderGrounded: "Pregunta sobre {ticker}…",
    chatPlaceholderUngrounded: "Pregunta cualquier cosa sobre finanzas…",
    chatInputLabel: "Entrada de chat",
    sendLabel: "Enviar mensaje",
    stopLabel: "Detener",
    chatErrorPrefix: "Error de chat",

    readArticle: "Leer artículo",
    requestFailed: "La solicitud falló",
  },
} as const;

export type TranslationKey = keyof (typeof TRANSLATIONS)["en"];

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

interface LanguageContextValue {
  language: Language;
  setLanguage: (next: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  children,
  initial = "en",
}: {
  children: ReactNode;
  initial?: Language;
}) {
  const [language, setLanguage] = useState<Language>(initial);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      format(TRANSLATIONS[language][key], vars),
    [language],
  );

  const value = useMemo(
    () => ({ language, setLanguage, t }),
    [language, t],
  );

  return createElement(LanguageContext.Provider, { value }, children);
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used inside <LanguageProvider>");
  }
  return ctx;
}
