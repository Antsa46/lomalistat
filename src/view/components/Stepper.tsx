import { cn } from "../../lib/utils";

interface StepperProps {
  steps: string[];
  current: number;
  onStepChange: (step: number) => void;
}

export function Stepper({ steps, current, onStepChange }: StepperProps) {
  return (
    <ol className="grid gap-2 md:grid-cols-6">
      {steps.map((step, index) => {
        const active = index === current;
        const complete = index < current;
        return (
          <li key={step}>
            <button
              type="button"
              onClick={() => onStepChange(index)}
              className={cn(
                "w-full rounded-xl border px-3 py-2 text-left text-xs font-semibold transition md:text-sm",
                active && "border-primary bg-primary text-primary-foreground",
                complete && "border-green-500 bg-green-50 text-green-800",
                !active && !complete && "border-border bg-white text-muted-foreground hover:text-foreground"
              )}
            >
              {index + 1}. {step}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

