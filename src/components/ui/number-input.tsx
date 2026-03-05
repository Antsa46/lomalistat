import * as React from "react";
import { cn } from "../../lib/utils";

interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: number;
  onValueChange: (next: number) => void;
}

export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value, onValueChange, onBlur, onFocus, onKeyDown, ...props }, ref) => {
    const [draft, setDraft] = React.useState(String(value));
    const [editing, setEditing] = React.useState(false);

    React.useEffect(() => {
      if (!editing) {
        setDraft(String(value));
      }
    }, [value, editing]);

    const commit = React.useCallback(() => {
      setEditing(false);
      const trimmed = draft.trim();
      if (trimmed === "") {
        setDraft(String(value));
        return;
      }
      const parsed = Number(trimmed);
      if (Number.isFinite(parsed)) {
        onValueChange(parsed);
      } else {
        setDraft(String(value));
      }
    }, [draft, onValueChange, value]);

    return (
      <input
        ref={ref}
        type="number"
        value={draft}
        className={cn(
          "h-10 w-full rounded-xl border border-border bg-white px-3 text-sm text-foreground shadow-sm outline-none ring-primary placeholder:text-muted-foreground focus:ring-2",
          className
        )}
        onFocus={(event) => {
          setEditing(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          commit();
          onBlur?.(event);
        }}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          if (raw.trim() === "" || raw === "-" || raw === "." || raw === "-.") {
            return;
          }
          const parsed = Number(raw);
          if (Number.isFinite(parsed)) {
            onValueChange(parsed);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commit();
          } else if (event.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
          onKeyDown?.(event);
        }}
        {...props}
      />
    );
  }
);

NumberInput.displayName = "NumberInput";

