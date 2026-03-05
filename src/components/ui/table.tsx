import * as React from "react";
import { cn } from "../../lib/utils";

export function TableWrapper({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("w-full overflow-auto rounded-xl border border-border", className)} {...props} />;
}

export function Table({ className, ...props }: React.ComponentProps<"table">) {
  return <table className={cn("w-full border-collapse text-sm", className)} {...props} />;
}

export function Th({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={cn(
        "border-b border-border bg-slate-100 px-2 py-2 text-left font-semibold text-slate-700",
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: React.ComponentProps<"td">) {
  return <td className={cn("border-b border-border px-2 py-2", className)} {...props} />;
}

