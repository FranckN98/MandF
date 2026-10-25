"use client";

import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { NAV_ITEMS } from "@/lib/site";

export function Navbar() {
  const [active, setActive] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 32, restDelta: 0.001 });

  // Section active : on observe une fine bande au milieu de l'écran.
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-nav]"));
    const inBand = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target as HTMLElement);
          else inBand.delete(e.target as HTMLElement);
        }
        const current = targets.filter((t) => inBand.has(t)).at(-1);
        if (current) setActive(current.dataset.nav ?? "");
        else if (window.scrollY < 240) setActive("");
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    toggleRef.current?.focus();
  }, []);

  // Menu mobile : Échap pour fermer, défilement de la page bloqué, focus piégé dans le panneau.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusables = () => panelRef.current?.querySelectorAll<HTMLElement>("a,button") ?? [];
    focusables()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        const items = Array.from(focusables());
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
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
  }, [open, close]);

  const currentLabel = NAV_ITEMS.find((i) => i.id === active)?.label;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || open ? "bg-white/85 shadow-[0_1px_0_0_rgb(94_60_158/0.08)] backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <nav aria-label="Navigation principale" className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <a href="#top" className="flex items-baseline gap-3 font-display text-2xl italic text-violet-deep" aria-label="Marleine & Franck — retour en haut">
          M<span className="not-italic">&amp;</span>F
          {currentLabel ? (
            <span className="hidden font-sans text-[11px] font-medium not-italic uppercase tracking-[0.2em] text-ink-soft sm:inline lg:hidden">{currentLabel}</span>
          ) : null}
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isActive = active === item.id;
            return (
              <li key={item.id} className="relative">
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative block rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-violet-deep" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {item.label}
                  {isActive ? (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-x-4 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-rose-deep to-violet"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  ) : null}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href="#confirmation"
            className="inline-flex h-11 items-center rounded-full bg-violet px-4 text-sm font-medium text-white shadow-soft transition hover:bg-violet-deep lg:px-5"
          >
            <span className="lg:hidden">Confirmer</span>
            <span className="hidden lg:inline">Je confirme ma présence</span>
          </a>
          <button
            ref={toggleRef}
            type="button"
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
            className="relative flex h-11 items-center gap-2 rounded-full border border-violet-deep/20 bg-white/70 px-4 text-sm font-medium text-violet-deep lg:hidden"
          >
            <span>{open ? "Fermer" : "Menu"}</span>
            <span aria-hidden className="flex h-3 w-4 flex-col justify-between">
              <span className={`h-px w-full bg-current transition-transform duration-300 ${open ? "translate-y-[5.5px] rotate-45" : ""}`} />
              <span className={`h-px w-full bg-current transition-opacity duration-300 ${open ? "opacity-0" : ""}`} />
              <span className={`h-px w-full bg-current transition-transform duration-300 ${open ? "-translate-y-[5.5px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>
      </nav>

      <motion.div aria-hidden style={{ scaleX: progress }} className="h-0.5 origin-left bg-gradient-to-r from-rose-deep via-violet to-violet-deep" />

      <AnimatePresence>
        {open ? (
          <motion.div
            id="menu-mobile"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-[66px] bottom-0 overflow-y-auto bg-blush/95 px-6 pb-10 pt-6 backdrop-blur-2xl lg:hidden"
          >
            <ol className="mx-auto max-w-md space-y-1">
              {NAV_ITEMS.map((item, i) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setOpen(false)}
                    aria-current={active === item.id ? "true" : undefined}
                    className={`flex items-baseline gap-4 rounded-2xl px-4 py-4 font-display text-3xl transition-colors ${
                      active === item.id ? "bg-lavender text-violet-deep" : "text-ink hover:bg-white"
                    }`}
                  >
                    <span className="w-6 font-sans text-xs tracking-widest text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ol>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}
