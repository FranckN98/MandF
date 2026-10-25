import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "light";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition duration-300 ease-out focus-visible:outline-violet disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-violet text-white shadow-soft hover:-translate-y-0.5 hover:bg-violet-deep",
  secondary: "border border-violet-deep/30 bg-white/70 text-violet-deep backdrop-blur hover:-translate-y-0.5 hover:border-violet-deep hover:bg-white",
  ghost: "text-violet-deep hover:bg-lavender",
  light: "bg-white text-violet-deep shadow-card hover:-translate-y-0.5 hover:bg-blush",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-7 py-3.5 text-base",
};

export const buttonClasses = (variant: Variant = "primary", size: Size = "lg", extra = "") =>
  `${base} ${variants[variant]} ${sizes[size]} ${extra}`;

type CommonProps = { variant?: Variant; size?: Size; children: ReactNode };

export function ButtonLink({
  variant = "primary",
  size = "lg",
  className = "",
  children,
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </a>
  );
}

export function Button({
  variant = "primary",
  size = "lg",
  className = "",
  children,
  type = "button",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}
