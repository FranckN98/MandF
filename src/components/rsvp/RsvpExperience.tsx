"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { RsvpForm, type SubmitOutcome } from "./RsvpForm";
import { ContactWhatsapp, ThankYou, type SubmissionResult } from "./ThankYou";

const STORAGE_KEY = "mf-rsvp-edit";
const SAVED_EVENT = "mf-rsvp-saved";
const SAFE_PATH = /^\/reponse\/[A-Za-z0-9_.-]{20,120}$/;

// Le lien personnel est mémorisé sur l'appareil (jamais envoyé ailleurs) : on ne conserve que le chemin, validé avant usage.
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener(SAVED_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(SAVED_EVENT, cb);
  };
};
const readSaved = () => {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY) ?? "";
    return SAFE_PATH.test(v) ? v : "";
  } catch {
    return "";
  }
};

async function postJson(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

export function RsvpExperience({ configured }: { configured: boolean }) {
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const savedPath = useSyncExternalStore(subscribe, readSaved, () => "");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!result) return;
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [result]);

  const submit = async (payload: Record<string, unknown>): Promise<SubmitOutcome> => {
    const { ok, data } = await postJson("/api/rsvp", payload);
    if (!ok) {
      return {
        ok: false,
        message: typeof data.message === "string" ? data.message : undefined,
        fieldErrors: (data.fieldErrors as Record<string, string> | undefined) ?? undefined,
      };
    }
    const emailSent = data.emailSent === true;
    if (data.status === "exists") {
      setResult({ status: "exists", emailSent });
    } else {
      const editUrl = typeof data.editUrl === "string" ? data.editUrl : undefined;
      if (editUrl) {
        try {
          window.localStorage.setItem(STORAGE_KEY, new URL(editUrl).pathname);
          window.dispatchEvent(new Event(SAVED_EVENT));
        } catch {
          // Stockage indisponible (navigation privée) : le lien reste affiché à l'écran.
        }
      }
      setResult({ status: "created", emailSent, editUrl });
    }
    return { ok: true };
  };

  return (
    <div>
      {!configured ? (
        <p role="note" className="mb-8 rounded-2xl border border-rose-deep/50 bg-rose/30 px-4 py-3 text-sm leading-relaxed text-ink">
          Les confirmations ne sont pas encore activées sur ce site (base de données non reliée). Les réponses ne peuvent pas être enregistrées pour le moment.
        </p>
      ) : null}

      {result ? (
        <ThankYou result={result} headingRef={headingRef} />
      ) : (
        <>
          {savedPath ? (
            <div role="note" className="mb-8 flex flex-col gap-3 rounded-2xl bg-lavender px-5 py-4 text-sm text-violet-deep sm:flex-row sm:items-center sm:justify-between">
              <p>Vous avez déjà répondu depuis cet appareil.</p>
              <ButtonLink href={savedPath} variant="primary" size="md">
                Modifier ma réponse
              </ButtonLink>
            </div>
          ) : null}
          <RsvpForm mode="create" onSubmit={submit} />
          <p className="mt-10 border-t border-line pt-6 text-center text-sm text-ink-soft">
            Une question ? <ContactWhatsapp />
            {!process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ? "Contactez directement les mariés." : null}
          </p>
        </>
      )}
    </div>
  );
}
