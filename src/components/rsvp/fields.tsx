"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

const controlBase =
  "w-full rounded-2xl border bg-white px-4 py-3 text-base text-ink placeholder:text-ink-soft/60 transition focus:border-violet focus:outline-none focus:ring-4 focus:ring-violet/20 read-only:bg-blush read-only:text-ink-soft";

interface FieldShellProps {
  id: string;
  label: ReactNode;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
}

/** Libellé + aide + message d'erreur reliés au champ (aria-describedby). */
export function FieldShell({ id, label, optional, hint, error, children }: FieldShellProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-sm font-medium text-ink">
        {label}
        {optional ? <span className="text-xs font-normal text-ink-soft">facultatif</span> : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs leading-relaxed text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

export function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-sm font-medium text-[#a6264f]">
      <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
        <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-.9 4.5h1.8v5H9.1v-5Zm0 6.5h1.8v1.8H9.1V13Z" />
      </svg>
      <span>{children}</span>
    </p>
  );
}

function describedBy(id: string, hint: boolean, error?: string) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: ReactNode;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
}

export function TextField({ id, label, optional, hint, error, className = "", ...rest }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} optional={optional} hint={hint} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(hint), error)}
        className={`${controlBase} ${error ? "border-[#a6264f]" : "border-line"} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  id: string;
  label: ReactNode;
  optional?: boolean;
  hint?: ReactNode;
  error?: string;
}

export function TextAreaField({ id, label, optional, hint, error, className = "", ...rest }: TextAreaFieldProps) {
  return (
    <FieldShell id={id} label={label} optional={optional} hint={hint} error={error}>
      <textarea
        id={id}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, Boolean(hint), error)}
        className={`${controlBase} resize-y ${error ? "border-[#a6264f]" : "border-line"} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
}

interface RadioCardsProps<T extends string> {
  id: string;
  legend: ReactNode;
  value: T | "";
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  error?: string;
  hint?: ReactNode;
  required?: boolean;
}

export function RadioCards<T extends string>({ id, legend, value, options, onChange, error, hint, required }: RadioCardsProps<T>) {
  return (
    <fieldset
      id={id}
      tabIndex={-1}
      aria-describedby={describedBy(id, Boolean(hint), error)}
      aria-invalid={error ? true : undefined}
      aria-required={required}
      className="min-w-0 focus:outline-none"
    >
      <legend className="mb-3 text-base font-medium leading-snug text-ink">{legend}</legend>
      <div className="grid gap-2.5">
        {options.map((o) => {
          const checked = value === o.value;
          return (
            <label
              key={o.value}
              className={`group relative flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 text-[0.95rem] transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-violet/25 ${
                checked ? "border-violet bg-lavender/70 text-ink shadow-card" : "border-line bg-white text-ink hover:border-violet/50"
              }`}
            >
              <input
                type="radio"
                name={id}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="peer sr-only"
              />
              <span
                aria-hidden
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${checked ? "border-violet" : "border-ink-soft/50"}`}
              >
                <span className={`h-2.5 w-2.5 rounded-full bg-violet transition ${checked ? "scale-100" : "scale-0"}`} />
              </span>
              <span>{o.label}</span>
            </label>
          );
        })}
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </fieldset>
  );
}

interface StepperProps {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  hint?: string;
  error?: string;
  /** Libellé court des boutons − / + quand le libellé visible est une question. */
  shortLabel?: string;
}

export function Stepper({ id, label, shortLabel, value, min, max, onChange, hint, error }: StepperProps) {
  const btn =
    "flex h-11 w-11 items-center justify-center rounded-full border border-violet-deep/25 bg-white text-xl text-violet-deep transition hover:bg-lavender disabled:opacity-40";
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} aria-label={`Diminuer : ${shortLabel ?? label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          <span aria-hidden>−</span>
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, Boolean(hint), error)}
          onChange={(e) => {
            const n = Number.parseInt(e.target.value, 10);
            onChange(Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min);
          }}
          className="h-11 w-16 rounded-xl border border-line bg-white text-center text-lg tabular-nums text-ink focus:border-violet focus:outline-none focus:ring-4 focus:ring-violet/20"
        />
        <button type="button" className={btn} aria-label={`Augmenter : ${shortLabel ?? label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          <span aria-hidden>+</span>
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> {
  id: string;
  children: ReactNode;
  error?: string;
}

export function Checkbox({ id, children, error, className = "", ...rest }: CheckboxProps) {
  return (
    <div>
      <label htmlFor={id} className={`flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-ink ${className}`}>
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 rounded-md border-2 border-ink-soft/60 accent-[#845EC2]"
          {...rest}
        />
        <span>{children}</span>
      </label>
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  );
}
