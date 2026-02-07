import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Step {
  number: number;
  title: string;
  shortTitle: string;
}

const STEPS: Step[] = [
  { number: 1, title: "Project Details", shortTitle: "Project" },
  { number: 2, title: "Select Activities", shortTitle: "Activities" },
  { number: 3, title: "Risk Assessments", shortTitle: "Risks" },
  { number: 4, title: "Method Statements", shortTitle: "Methods" },
  { number: 5, title: "Review & Sign", shortTitle: "Review" },
];

interface RamsProgressBarProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  completedSteps?: number[];
}

export function RamsProgressBar({ 
  currentStep, 
  onStepClick,
  completedSteps = [] 
}: RamsProgressBarProps) {
  return (
    <div className="w-full">
      {/* Mobile view */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="text-sm text-muted-foreground">
            {STEPS[currentStep - 1]?.title}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(currentStep / STEPS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop view */}
      <div className="hidden sm:block">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {STEPS.map((step, index) => {
              const isCompleted = completedSteps.includes(step.number) || step.number < currentStep;
              const isCurrent = step.number === currentStep;
              const isClickable = onStepClick && (isCompleted || step.number === currentStep);

              return (
                <li 
                  key={step.number} 
                  className={cn(
                    "relative flex-1",
                    index !== STEPS.length - 1 && "pr-8 sm:pr-20"
                  )}
                >
                  {/* Connector line */}
                  {index !== STEPS.length - 1 && (
                    <div 
                      className="absolute top-4 left-0 -right-8 sm:-right-20 h-0.5"
                      aria-hidden="true"
                    >
                      <div className={cn(
                        "h-full",
                        isCompleted ? "bg-primary" : "bg-muted"
                      )} />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick?.(step.number)}
                    disabled={!isClickable}
                    className={cn(
                      "relative flex flex-col items-center group",
                      isClickable && "cursor-pointer"
                    )}
                  >
                    {/* Step circle */}
                    <span
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                        isCompleted && "border-primary bg-primary text-primary-foreground",
                        isCurrent && !isCompleted && "border-primary bg-background text-primary",
                        !isCompleted && !isCurrent && "border-muted bg-background text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        step.number
                      )}
                    </span>

                    {/* Step label */}
                    <span
                      className={cn(
                        "mt-2 text-xs font-medium hidden lg:block",
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {step.title}
                    </span>
                    <span
                      className={cn(
                        "mt-2 text-xs font-medium lg:hidden",
                        isCurrent ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {step.shortTitle}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
}
