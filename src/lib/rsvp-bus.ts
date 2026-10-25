"use client";

export type RsvpPrefill = { attendance?: "yes"; accommodation?: "interested" };

export const RSVP_PREFILL_EVENT = "rsvp:prefill";

/** Ouvre le formulaire de confirmation (défilement) et demande sa présélection, par ex. « logement commun ». */
export function requestRsvpPrefill(prefill: RsvpPrefill) {
  window.dispatchEvent(new CustomEvent<RsvpPrefill>(RSVP_PREFILL_EVENT, { detail: prefill }));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("confirmation")?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}
