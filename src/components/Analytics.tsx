"use client";

import { GoogleAnalytics } from "@next/third-parties/google";

import { gaId } from "@/lib/analytics";
import { useConsent } from "@/lib/consent";

/** Loads GA4 only when an ID is configured AND the visitor opted in. */
export default function Analytics() {
  const { consent } = useConsent();
  const id = gaId();
  if (!id || consent !== "granted") return null;
  return <GoogleAnalytics gaId={id} />;
}
