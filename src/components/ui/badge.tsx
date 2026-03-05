import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold", {
  variants: {
    variant: {
      default: "bg-slate-200 text-slate-900",
      success: "bg-green-100 text-green-900",
      warning: "bg-amber-100 text-amber-900",
      danger: "bg-red-100 text-red-900",
      outline: "border border-border text-foreground"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

