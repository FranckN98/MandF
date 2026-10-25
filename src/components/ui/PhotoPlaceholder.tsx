interface PhotoPlaceholderProps {
  /** Texte principal (année, nom du lieu…). */
  label?: string;
  /** Mention discrète sous le texte principal. */
  hint?: string;
  className?: string;
  /** Monogramme central. */
  monogram?: string;
}

/** Emplacement élégant pour une photographie à fournir : aucun faux portrait n'est généré. */
export function PhotoPlaceholder({ label, hint = "Photographie à venir", className = "", monogram = "M & F" }: PhotoPlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label ? `${label} — ${hint}` : hint}
      className={`relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-rose/70 via-blush to-lavender text-center ${className}`}
    >
      <div aria-hidden className="absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/50 blur-2xl" />
      <div aria-hidden className="absolute -bottom-12 -right-8 h-56 w-56 rounded-full bg-violet/15 blur-3xl" />
      <div aria-hidden className="absolute inset-6 rounded-[inherit] border border-violet/20" />
      <span className="relative font-display text-4xl italic text-violet-deep sm:text-5xl">{monogram}</span>
      {label ? <span className="relative mt-3 font-display text-2xl text-ink">{label}</span> : null}
      <span className="relative mt-2 text-xs uppercase tracking-[0.2em] text-ink-soft">{hint}</span>
    </div>
  );
}
