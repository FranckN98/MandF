"use client";

import { useEffect, useRef, useState } from "react";
import type { RecapLine } from "@/lib/recap";
import { RsvpForm, type SubmitOutcome } from "./RsvpForm";
import { ResendLink } from "./ResendLink";
import { ThankYou, type SubmissionResult } from "./ThankYou";

async function postJson(url: string, payload: Record<string, unknown>) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

export function RsvpExperience({ dinnerNote, configured }: { dinnerNote: string; configured: boolean }) {
  const [result, setResult] = useState<SubmissionResult | null>(null);
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
    const base = { firstName: String(payload.firstName), email: String(payload.email).trim().toLowerCase() };
    if (data.status === "exists") {
      setResult({ status: "exists", ...base, emailSent: data.emailSent === true });
    } else {
      setResult({
        status: "created",
        ...base,
        attendance: String(payload.attendance),
        recap: (data.recap as RecapLine[] | undefined) ?? [],
        emailSent: data.emailSent === true,
        editUrl: typeof data.editUrl === "string" ? data.editUrl : undefined,
      });
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
      {result ? <ThankYou result={result} headingRef={headingRef} /> : <RsvpForm mode="create" onSubmit={submit} dinnerNote={dinnerNote} />}
      {!result ? <ResendLink /> : null}
    </div>
  );
}
