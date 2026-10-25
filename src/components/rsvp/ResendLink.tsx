"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "./fields";
import { TURNSTILE_SITE_KEY, TurnstileWidget } from "./TurnstileWidget";

/** « Vous avez déjà répondu ? » : renvoi du lien personnel de modification par e-mail. */
export function ResendLink() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (TURNSTILE_SITE_KEY && !token) {
      setError("Veuillez terminer la vérification anti-robot.");
      return;
    }
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/rsvp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, turnstileToken: token }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (res.ok) {
        setState("sent");
        return;
      }
      setError(data.message ?? "Une erreur est survenue. Merci de réessayer.");
    } catch {
      setError("Connexion impossible. Merci de réessayer.");
    }
    setState("idle");
    setResetKey((k) => k + 1);
  };

  return (
    <div className="mt-10 border-t border-line pt-6 text-center">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={false}
          className="text-sm font-medium text-violet-deep underline decoration-violet/40 underline-offset-4 hover:decoration-violet"
        >
          Vous avez déjà répondu ? Recevoir mon lien de modification
        </button>
      ) : state === "sent" ? (
        <p role="status" className="text-sm leading-relaxed text-ink-soft">
          Si une réponse existe pour cette adresse, un e-mail contenant votre lien personnel vient d&apos;être envoyé. Pensez à vérifier vos courriers indésirables.
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="mx-auto max-w-sm text-left">
          <TextField
            id="resend-email"
            label="Votre adresse e-mail"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error ?? undefined}
          />
          <TurnstileWidget onToken={setToken} resetKey={resetKey} />
          <Button type="submit" size="md" variant="secondary" className="mt-4" disabled={state === "sending" || email.trim() === ""}>
            {state === "sending" ? "Envoi…" : "Recevoir mon lien"}
          </Button>
        </form>
      )}
    </div>
  );
}
