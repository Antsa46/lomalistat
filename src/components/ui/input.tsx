import * as React from "react";
import { cn } from "../../lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground shadow-sm outline-none ring-primary placeholder:text-muted-foreground focus:ring-2",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
