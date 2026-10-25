"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PhotoData } from "@/content/photos";
import { Photo } from "@/components/ui/Photo";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";

const INTERVAL_MS = 4500;

interface CircleGalleryProps {
  photos: PhotoData[];
}

/** Grand médaillon circulaire : fondu enchaîné automatique, navigation manuelle, anneau rose/violet. */
export function CircleGallery({ photos }: CircleGalleryProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const startX = useRef<number | null>(null);
  const count = photos.length;
  const multiple = count > 1;

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count]);

  useEffect(() => {
    const onVisibility = () => setTabVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const autoplay = multiple && playing && !reduced && !hovered && tabVisible;
  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(() => go(1), INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [autoplay, index, go]);

  const onPointerUp = (e: React.PointerEvent) => {
    if (startX.current === null || !multiple) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 45) go(dx < 0 ? 1 : -1);
  };

  return (
    <div className="relative mx-auto w-full max-w-[min(88vw,520px)]">
      <div
        role="group"
        aria-roledescription="carrousel"
        aria-label="Photographies de Marleine et Franck"
        className="relative aspect-square w-full animate-float"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div aria-hidden className="absolute -inset-6 rounded-full bg-gradient-to-br from-rose/70 to-lavender blur-3xl" />
        <div aria-hidden className="ring-gradient absolute inset-0 animate-ring rounded-full opacity-90 motion-reduce:animate-none" />
        <div aria-hidden className="absolute inset-[5px] rounded-full bg-white" />

        <div
          className="absolute inset-[11px] touch-pan-y overflow-hidden rounded-full bg-lavender"
          onPointerDown={(e) => (startX.current = e.clientX)}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (startX.current = null)}
        >
          {count === 0 ? (
            <PhotoPlaceholder hint="Photographies à venir" className="rounded-full" />
          ) : (
            <AnimatePresence initial={false}>
              <motion.div
                key={index}
                className="absolute inset-0"
                initial={{ opacity: 0, scale: 1.06 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ opacity: { duration: 1.2, ease: "easeInOut" }, scale: { duration: 6, ease: "easeOut" } }}
                aria-live={playing && !reduced ? "off" : "polite"}
              >
                <Photo
                  photo={{ ...photos[index], focus: photos[index].focus ?? "50% 35%" }}
                  sizes="(min-width: 1024px) 480px, 88vw"
                  priority={index === 0}
                  className="h-full w-full"
                />
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <span aria-hidden className="absolute -right-1 top-[14%] h-3 w-3 rounded-full bg-rose-deep shadow-soft" />
        <span aria-hidden className="absolute -left-2 bottom-[18%] h-4 w-4 rounded-full bg-violet/70 shadow-soft" />
      </div>

      {multiple ? (
        <div className="mt-6 flex items-center justify-center gap-3">
          <RoundButton label="Photo précédente" onClick={() => go(-1)}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12.5 4.5 7 10l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </RoundButton>
          <div className="flex items-center gap-2" role="tablist" aria-label="Choisir une photo">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Photo ${i + 1} sur ${count}`}
                onClick={() => setIndex(i)}
                className="group flex h-8 w-5 items-center justify-center"
              >
                <span className={`h-2 rounded-full transition-all duration-500 ${i === index ? "w-6 bg-violet" : "w-2 bg-violet/30 group-hover:bg-violet/60"}`} />
              </button>
            ))}
          </div>
          <RoundButton label="Photo suivante" onClick={() => go(1)}>
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M7.5 4.5 13 10l-5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </RoundButton>
          <RoundButton label={playing ? "Mettre le diaporama en pause" : "Lancer le diaporama"} onClick={() => setPlaying((p) => !p)}>
            {playing && !reduced ? (
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
                <rect x="5" y="4" width="3.5" height="12" rx="1" />
                <rect x="11.5" y="4" width="3.5" height="12" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M6 4.2v11.6a.6.6 0 0 0 .9.5l9.2-5.8a.6.6 0 0 0 0-1L6.9 3.7a.6.6 0 0 0-.9.5Z" />
              </svg>
            )}
          </RoundButton>
        </div>
      ) : null}
    </div>
  );
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-violet-deep/20 bg-white/80 text-violet-deep transition hover:-translate-y-0.5 hover:bg-white hover:shadow-card"
    >
      {children}
    </button>
  );
}
