import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  id?: string;
  tone?: "dark" | "light";
}

export function SectionHeading({ eyebrow, title, intro, align = "center", id, tone = "dark" }: SectionHeadingProps) {
  const center = align === "center";
  const light = tone === "light";
  return (
    <Reveal className={`${center ? "mx-auto text-center" : ""} max-w-3xl`}>
      <p className={`text-xs font-medium uppercase tracking-[0.28em] ${light ? "text-rose" : "text-violet-deep"}`}>{eyebrow}</p>
      <h2 id={id} className={`mt-4 font-display text-4xl font-medium leading-[1.05] sm:text-5xl lg:text-6xl ${light ? "text-white" : "text-ink"}`}>
        {title}
      </h2>
      {intro ? <p className={`mt-5 text-base leading-relaxed sm:text-lg ${light ? "text-white/85" : "text-ink-soft"}`}>{intro}</p> : null}
    </Reveal>
  );
}
