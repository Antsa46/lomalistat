import * as React from "react";
import { cn } from "../../lib/utils";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "min-h-20 w-full rounded-xl border border-border bg-white p-3 text-sm text-foreground shadow-sm outline-none ring-primary placeholder:text-muted-foreground focus:ring-2",
        className
      )}
      {...props}
    />
  )
);

Textarea.displayName = "Textarea";

