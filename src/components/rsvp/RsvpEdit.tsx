"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { RsvpForm, type SubmitOutcome } from "./RsvpForm";
import type { FormValues } from "./form-values";
import { ThankYou, type SubmissionResult } from "./ThankYou";

interface RsvpEditProps {
  token: string;
  initialValues: FormValues;
}

export function RsvpEdit({ token, initialValues }: RsvpEditProps) {
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const deletedRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (result) headingRef.current?.focus();
  }, [result]);
  useEffect(() => {
    if (deleted) deletedRef.current?.focus();
  }, [deleted]);

  const submit = async (payload: Record<string, unknown>): Promise<SubmitOutcome> => {
    const res = await fetch(`/api/rsvp/${encodeURIComponent(token)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      return {
        ok: false,
        message: typeof data.message === "string" ? data.message : undefined,
        fieldErrors: (data.fieldErrors as Record<string, string> | undefined) ?? undefined,
      };
    }
    setResult({ status: "updated", emailSent: data.emailSent === true });
    window.scrollTo({ top: 0, behavior: "smooth" });
    return { ok: true };
  };

  const remove = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/rsvp/${encodeURIComponent(token)}`, { method: "DELETE" });
      if (res.ok) {
        try {
          window.localStorage.removeItem("mf-rsvp-edit");
        } catch {
          // sans importance : le lien ne sera simplement plus valide
        }
        setDeleted(true);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setDeleteError(data.message ?? "La suppression n'a pas pu être effectuée.");
    } catch {
      setDeleteError("Connexion impossible. Merci de réessayer.");
    } finally {
      setDeleting(false);
    }
  };

  if (deleted) {
    return (
      <div className="text-center">
        <h2 ref={deletedRef} tabIndex={-1} className="font-display text-4xl font-medium text-ink focus:outline-none">
          Votre réponse a été supprimée
        </h2>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-soft">
          Vos informations personnelles ont été effacées de notre base. Si vous changez d&apos;avis, vous pouvez à tout moment répondre à nouveau depuis le site.
        </p>
        <div className="mt-8">
          <ButtonLink href="/" variant="primary">
            Retour au site
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div>
        <ThankYou result={result} headingRef={headingRef} />
        <div className="mt-8 text-center">
          <Button variant="secondary" size="md" onClick={() => setResult(null)}>
            Modifier à nouveau
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <RsvpForm mode="edit" initialValues={initialValues} onSubmit={submit} submitLabel="Enregistrer mes modifications" idPrefix="edit" />

      <div className="mt-12 rounded-3xl border border-line bg-blush/60 p-6">
        <h3 className="font-display text-2xl font-medium text-ink">Supprimer ma réponse</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Vous pouvez effacer définitivement votre réponse et vos informations personnelles. Cette action est irréversible.
        </p>
        {confirmDelete ? (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center" role="group" aria-label="Confirmer la suppression">
            <Button variant="primary" size="md" onClick={remove} disabled={deleting} className="!bg-[#a6264f] hover:!bg-[#7d1d3d]">
              {deleting ? "Suppression…" : "Oui, supprimer définitivement"}
            </Button>
            <Button variant="ghost" size="md" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Annuler
            </Button>
          </div>
        ) : (
          <div className="mt-4">
            <Button variant="secondary" size="md" onClick={() => setConfirmDelete(true)}>
              Supprimer ma réponse
            </Button>
          </div>
        )}
        {deleteError ? (
          <p role="alert" className="mt-3 text-sm font-medium text-[#a6264f]">
            {deleteError}
          </p>
        ) : null}
      </div>
    </div>
  );
}
