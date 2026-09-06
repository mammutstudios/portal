import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

/**
 * Knoppen. De opmaak zit in `globals.css`; deze component bestaat alleen om
 * de klassen op één plek te houden.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

type Opmaak = {
  variant?: Variant;
  size?: Size;
  className?: string;
};

function klassen({ variant = "primary", size = "sm", className = "" }: Opmaak) {
  return [
    "mammut-button",
    `mammut-button--${variant}`,
    size === "md" ? "mammut-button--md" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = ComponentPropsWithoutRef<"button"> & Opmaak;

export default function Button({ variant, size, className, children, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={klassen({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentPropsWithoutRef<typeof Link> & Opmaak;

export function ButtonLink({ variant, size, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={klassen({ variant, size, className })} {...rest}>
      {children}
    </Link>
  );
}
