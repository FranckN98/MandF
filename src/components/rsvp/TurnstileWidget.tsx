"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface TurnstileWidgetProps {
  onToken: (token: string | null) => void;
  /** Incrémenter pour redemander un jeton (par ex. après un envoi refusé). */
  resetKey?: number;
}

/** Cloudflare Turnstile (anti-robots respectueux de la vie privée). Rendu seulement si la clé publique est configurée. */
export function TurnstileWidget({ onToken, resetKey = 0 }: TurnstileWidgetProps) {
  const host = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const callback = useRef(onToken);
  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !host.current) return;
    let cancelled = false;

    const mount = () => {
      if (cancelled || !host.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(host.current, {
        sitekey: TURNSTILE_SITE_KEY,
        language: "fr",
        theme: "light",
        callback: (t: string) => callback.current(t),
        "expired-callback": () => callback.current(null),
        "error-callback": () => callback.current(null),
      });
    };

    if (window.turnstile) mount();
    else {
      let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
      if (!script) {
        script = document.createElement("script");
        script.src = SCRIPT_SRC;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
    }
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, []);

  useEffect(() => {
    if (resetKey > 0 && widgetId.current && window.turnstile) {
      callback.current(null);
      window.turnstile.reset(widgetId.current);
    }
  }, [resetKey]);

  if (!TURNSTILE_SITE_KEY) return null;
  return <div ref={host} className="min-h-[65px]" />;
}
