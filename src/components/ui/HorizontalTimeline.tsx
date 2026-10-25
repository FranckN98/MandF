"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { PhotoData } from "@/content/photos";
import { Photo } from "@/components/ui/Photo";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";

export interface TimelinePhoto {
  photo?: PhotoData;
  /** Affiché quand aucune photo n'est encore fournie. */
  placeholder?: { label?: string; hint?: string };
  caption?: string;
}

export interface TimelineStep {
  id: string;
  /** Année ou heure affichée sur la frise. */
  marker: string;
  /** Fin de plage horaire éventuelle (ex. 13h30). */
  markerEnd?: string;
  /** Mention discrète au-dessus du marqueur (ex. « À partir de »). */
  markerPrefix?: string;
  /** Libellé court sous le marqueur (desktop). */
  railLabel?: string;
  title: string;
  text: string;
  extra?: ReactNode;
  photos: TimelinePhoto[];
}

interface HorizontalTimelineProps {
  steps: TimelineStep[];
  label: string;
  variant: "story" | "program";
}

const ARROW_PATH_L = "M12.5 4.5 7 10l5.5 5.5";
const ARROW_PATH_R = "M7.5 4.5 13 10l-5.5 5.5";

function Chevron({ dir }: { dir: "l" | "r" }) {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d={dir === "l" ? ARROW_PATH_L : ARROW_PATH_R} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function markerText(s: TimelineStep) {
  return s.markerEnd ? `${s.marker} → ${s.markerEnd}` : s.marker;
}

// Les photos verticales gardent un cadre vertical : on ne coupe pas les visages pour remplir un cadre paysage.
const isPortrait = (p?: TimelinePhoto) => Boolean(p?.photo && p.photo.height > p.photo.width * 1.05);
const ratioOf = (p?: TimelinePhoto) => (isPortrait(p) ? "4 / 5" : "4 / 3");

function PhotoSlot({ item, sizes, className = "", ratio }: { item: TimelinePhoto; sizes: string; className?: string; ratio?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={ratio ? { aspectRatio: ratio } : undefined}>
      {item.photo ? (
        <Photo photo={item.photo} sizes={sizes} className="h-full w-full" />
      ) : (
        <PhotoPlaceholder label={item.placeholder?.label} hint={item.placeholder?.hint} />
      )}
      {item.caption ? (
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-violet-deep shadow-card backdrop-blur">
          {item.caption}
        </span>
      ) : null}
    </div>
  );
}

export function HorizontalTimeline({ steps, label, variant }: HorizontalTimelineProps) {
  const uid = useId();
  const reduced = useReducedMotion();
  const n = steps.length;
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const scroller = useRef<HTMLDivElement>(null);

  const goTo = useCallback(
    (target: number) => {
      const next = Math.max(0, Math.min(n - 1, target));
      setDir(next >= index ? 1 : -1);
      setIndex(next);
    },
    [index, n],
  );

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: n - 1 };
    if (!(e.key in keys)) return;
    e.preventDefault();
    const next = Math.max(0, Math.min(n - 1, keys[e.key]));
    goTo(next);
    tabRefs.current[next]?.focus();
  };

  // Mobile : la carte la plus visible du carrousel devient l'étape courante.
  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const i = Number((e.target as HTMLElement).dataset.index);
            if (!Number.isNaN(i)) setIndex((cur) => (cur === i ? cur : i));
          }
        }
      },
      { root, threshold: 0.6 },
    );
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [n]);

  const scrollToCard = (i: number) => {
    const root = scroller.current;
    const card = root?.querySelector<HTMLElement>(`[data-index="${i}"]`);
    if (!root || !card) return;
    root.scrollTo({ left: card.offsetLeft - 20, behavior: reduced ? "auto" : "smooth" });
  };

  const step = steps[index];
  const pct = n > 1 ? (index / (n - 1)) * 100 : 0;
  const isProgram = variant === "program";

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 56 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -56 }),
  };

  return (
    <div>
      <p className="sr-only" aria-live="polite">
        Étape {index + 1} sur {n} : {step.title}
      </p>

      {/* ------------------------------ Bureau / tablette ------------------------------ */}
      <div className="hidden md:block">
        <div className="relative px-2">
          <div aria-hidden className="absolute top-[22px] h-px bg-line" style={{ left: `calc(100% / ${2 * n})`, right: `calc(100% / ${2 * n})` }}>
            <motion.div
              className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-rose-deep to-violet"
              initial={false}
              animate={{ width: `${pct}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 20 }}
            />
          </div>

          <div role="tablist" aria-label={label} onKeyDown={onTabKey} className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
            {steps.map((s, i) => {
              const state = i < index ? "past" : i === index ? "active" : "future";
              return (
                <button
                  key={s.id}
                  ref={(el) => {
                    tabRefs.current[i] = el;
                  }}
                  type="button"
                  role="tab"
                  id={`${uid}-tab-${i}`}
                  aria-selected={state === "active"}
                  aria-controls={`${uid}-panel`}
                  tabIndex={state === "active" ? 0 : -1}
                  onClick={() => goTo(i)}
                  className="group flex flex-col items-center px-2 text-center"
                >
                  <span className="relative flex h-11 w-11 items-center justify-center">
                    {state === "active" ? (
                      <>
                        <motion.span layoutId={`${uid}-marker`} className="absolute -inset-1.5 rounded-full border-2 border-violet/50" transition={{ type: "spring", stiffness: 300, damping: 28 }} />
                        <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full bg-violet/25 motion-reduce:hidden" />
                      </>
                    ) : null}
                    <span
                      className={`relative flex h-11 w-11 items-center justify-center rounded-full border text-sm font-semibold transition-colors duration-500 ${
                        state === "past"
                          ? "border-violet bg-violet text-white"
                          : state === "active"
                            ? "border-violet bg-white text-violet-deep shadow-card"
                            : "border-line bg-white text-ink-soft group-hover:border-violet/50"
                      }`}
                    >
                      {isProgram ? String(i + 1).padStart(2, "0") : <span className={`h-2.5 w-2.5 rounded-full ${state === "future" ? "bg-line" : state === "active" ? "bg-violet" : "bg-white"}`} />}
                    </span>
                  </span>
                  <span
                    className={`mt-3 font-display leading-none transition-colors duration-500 ${isProgram ? "text-2xl" : "text-3xl lg:text-4xl"} ${
                      state === "active" ? "text-violet-deep" : state === "past" ? "text-ink" : "text-ink-soft/80"
                    }`}
                  >
                    {s.marker}
                  </span>
                  {isProgram && s.railLabel ? (
                    <span className={`mt-1.5 text-xs font-medium leading-snug ${state === "active" ? "text-ink" : "text-ink-soft"}`}>{s.railLabel}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${index}`} className="relative mt-12 min-h-[26rem]">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step.id}
              custom={dir}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14"
            >
              {step.photos.length > 1 ? (
                <div className="grid grid-cols-2 items-start gap-4 lg:col-span-7">
                  {step.photos.slice(0, 2).map((p, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 + i * 0.25, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                      className={i === 1 ? "mt-10" : ""}
                    >
                      <PhotoSlot item={p} sizes="(min-width: 1024px) 300px, 45vw" ratio="4 / 5" className="rounded-[1.75rem] bg-lavender shadow-soft" />
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="relative mx-auto w-full lg:col-span-7" style={isPortrait(step.photos[0]) ? { maxWidth: "25rem" } : undefined}>
                  <motion.div initial={{ scale: 1.07 }} animate={{ scale: 1 }} transition={{ duration: 1.6, ease: "easeOut" }} className="origin-center">
                    <PhotoSlot
                      item={step.photos[0]}
                      sizes={isPortrait(step.photos[0]) ? "400px" : "(min-width: 1024px) 640px, 90vw"}
                      ratio={ratioOf(step.photos[0])}
                      className="rounded-[2rem] bg-lavender shadow-soft"
                    />
                  </motion.div>
                </div>
              )}

              <div className="lg:col-span-5">
                {step.markerPrefix ? <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-ink-soft">{step.markerPrefix}</p> : null}
                <p className="font-display text-6xl leading-none text-violet lg:text-7xl">{markerText(step)}</p>
                {isProgram ? (
                  <p className="mt-3 text-xs font-medium uppercase tracking-[0.24em] text-ink-soft">
                    Étape {index + 1} sur {n}
                  </p>
                ) : null}
                <h3 className="mt-5 font-display text-3xl font-medium leading-tight text-ink lg:text-4xl">{step.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-ink-soft lg:text-lg">{step.text}</p>
                {step.extra ? <div className="mt-5">{step.extra}</div> : null}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-12 flex items-center gap-5">
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            disabled={index === 0}
            className="inline-flex h-12 items-center gap-2 rounded-full border border-violet-deep/25 bg-white px-5 text-sm font-medium text-violet-deep transition hover:-translate-y-0.5 hover:shadow-card disabled:pointer-events-none disabled:opacity-40"
          >
            <Chevron dir="l" /> Précédent
          </button>
          <div className="flex flex-1 items-center gap-4">
            <div aria-hidden className="h-1.5 flex-1 overflow-hidden rounded-full bg-lavender">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-deep to-violet"
                initial={false}
                animate={{ width: `${((index + 1) / n) * 100}%` }}
                transition={{ type: "spring", stiffness: 90, damping: 20 }}
              />
            </div>
            <span className="text-sm tabular-nums text-ink-soft">
              {String(index + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}
            </span>
          </div>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            disabled={index === n - 1}
            className="inline-flex h-12 items-center gap-2 rounded-full bg-violet px-5 text-sm font-medium text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-violet-deep disabled:pointer-events-none disabled:opacity-40"
          >
            Suivant <Chevron dir="r" />
          </button>
        </div>
      </div>

      {/* ------------------------------ Smartphone : carrousel tactile ------------------------------ */}
      <div className="md:hidden">
        <div className="px-5">
          <div className="flex items-end justify-between">
            <div aria-hidden>
              {step.markerPrefix ? <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-soft">{step.markerPrefix}</p> : null}
              <p className="font-display text-5xl leading-none text-violet">{markerText(step)}</p>
            </div>
            <p className="pb-1 text-sm tabular-nums text-ink-soft" aria-hidden>
              {index + 1} / {n}
            </p>
          </div>
          <div className="mt-4 flex gap-1.5" role="group" aria-label={`${label} — aller à l'étape`}>
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Étape ${i + 1} : ${s.marker}`}
                aria-current={i === index ? "step" : undefined}
                onClick={() => scrollToCard(i)}
                className="flex h-6 flex-1 items-center"
              >
                <span className={`h-1.5 w-full rounded-full transition-colors duration-500 ${i <= index ? "bg-violet" : "bg-line"}`} />
              </button>
            ))}
          </div>
        </div>

        <div
          ref={scroller}
          className="no-scrollbar relative mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-6 [overscroll-behavior-x:contain] [scroll-padding-inline:1.25rem]"
          role="region"
          tabIndex={0}
          aria-label={`${label} — faites défiler horizontalement`}
        >
          {steps.map((s, i) => (
            <article
              key={s.id}
              data-index={i}
              className="w-[86%] shrink-0 snap-start overflow-hidden rounded-3xl bg-white shadow-card last:mr-5"
            >
              <div className={`grid gap-0.5 ${s.photos.length > 1 ? "grid-cols-2" : ""}`}>
                {s.photos.map((p, k) => (
                  <PhotoSlot
                    key={k}
                    item={p}
                    sizes={s.photos.length > 1 ? "45vw" : "86vw"}
                    ratio={s.photos.length > 1 ? "3 / 4" : ratioOf(p)}
                  />
                ))}
              </div>
              <div className="p-5">
                {s.markerPrefix ? <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.22em] text-ink-soft">{s.markerPrefix}</p> : null}
                <p className="font-display text-3xl leading-none text-violet">{markerText(s)}</p>
                <h3 className="mt-3 font-display text-2xl font-medium leading-tight text-ink">{s.title}</h3>
                <p className="mt-3 text-[0.95rem] leading-relaxed text-ink-soft">{s.text}</p>
                {s.extra ? <div className="mt-4">{s.extra}</div> : null}
              </div>
            </article>
          ))}
        </div>
        <p className="px-5 text-center text-xs text-ink-soft">Faites glisser pour passer à l&apos;étape suivante</p>
      </div>
    </div>
  );
}
