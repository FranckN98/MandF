"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { photoUrl, type PhotoData } from "@/content/photos";
import { Photo } from "@/components/ui/Photo";

export interface GalleryItem {
  photo: PhotoData;
  /** Classes de grille (taille de la tuile). */
  tile: string;
  focus?: string;
}

export function Gallery({ items }: { items: GalleryItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const count = items.length;

  const close = useCallback(() => {
    setOpen(null);
    triggerRef.current?.focus();
  }, []);
  const step = useCallback((d: number) => setOpen((i) => (i === null ? i : (i + d + count) % count)), [count]);

  useEffect(() => {
    if (open === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") {
        const f = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button,a") ?? []);
        if (f.length === 0) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close, step]);

  const current = open === null ? null : items[open].photo;
  const widths = current ? [...current.widths].sort((a, b) => a - b) : [];

  return (
    <>
      <ul className="grid auto-rows-[9.5rem] grid-flow-dense grid-cols-2 gap-3 md:auto-rows-[11.5rem] md:grid-cols-4 md:gap-4">
        {items.map((item, i) => (
          <li key={item.photo.src} className={item.tile}>
            <button
              type="button"
              onClick={(e) => {
                triggerRef.current = e.currentTarget;
                setOpen(i);
              }}
              aria-label={`Agrandir la photographie : ${item.photo.caption ?? item.photo.alt}`}
              className="group relative block h-full w-full overflow-hidden rounded-3xl bg-lavender text-left shadow-card"
            >
              <Photo
                photo={{ ...item.photo, focus: item.focus }}
                sizes="(min-width: 768px) 25vw, 50vw"
                className="h-full w-full"
                imgClassName="transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]"
              />
              <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100" />
              <span className="absolute inset-x-3 bottom-3 translate-y-2 text-xs font-medium text-white opacity-0 transition duration-500 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100">
                {item.photo.caption}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <AnimatePresence>
        {current ? (
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Photographie en plein écran"
            className="fixed inset-0 z-[90] flex flex-col bg-ink/95 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={close}
            onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchX.current === null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              touchX.current = null;
              if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 text-white/80">
              <p className="text-sm tabular-nums" aria-live="polite">
                {(open ?? 0) + 1} / {count}
              </p>
              <button
                ref={closeRef}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                }}
                className="flex h-11 items-center gap-2 rounded-full border border-white/30 px-4 text-sm text-white transition hover:bg-white/10"
              >
                Fermer
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <figure className="relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element -- variantes WebP pré-générées */}
              <img
                key={current.src}
                src={photoUrl(current, widths[widths.length - 1])}
                srcSet={widths.map((w) => `${photoUrl(current, w)} ${w}w`).join(", ")}
                sizes="100vw"
                alt={current.alt}
                className="max-h-[calc(100dvh-11rem)] w-auto max-w-full rounded-2xl object-contain shadow-soft"
              />
              <figcaption className="mt-4 max-w-2xl text-center text-sm leading-relaxed text-white/85">
                <span className="block font-medium text-white">{current.caption}</span>
                {current.credit ? (
                  <span className="mt-1 block text-xs text-white/70">
                    Photo : {current.credit.author} ·{" "}
                    <a className="underline underline-offset-2" href={current.credit.licenseUrl || current.credit.sourceUrl} target="_blank" rel="noopener noreferrer">
                      {current.credit.license}
                    </a>{" "}
                    ·{" "}
                    <Link className="underline underline-offset-2" href="/credits">
                      Crédits
                    </Link>
                  </span>
                ) : null}
              </figcaption>

              <button
                type="button"
                aria-label="Photo précédente"
                onClick={() => step(-1)}
                className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 md:left-6"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Photo suivante"
                onClick={() => step(1)}
                className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/30 md:right-6"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                  <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </figure>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
