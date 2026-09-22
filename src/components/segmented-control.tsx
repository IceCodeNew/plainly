import type { ReactNode } from "react"
import { cn } from "@/utils/styles/utils"

export interface SegmentedOption<T extends string> {
  value: T
  label: ReactNode
}

interface SegmentedControlProps<T extends string> {
  "value": T
  "options": readonly SegmentedOption<T>[]
  "onChange": (value: T) => void
  "aria-label": string
  "size"?: "sm" | "default"
  "className"?: string
}

/**
 * A row of mutually exclusive choices. Used instead of a select when there
 * are only two or three options, so every option stays visible.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  "aria-label": ariaLabel,
  size = "default",
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn("flex gap-0.5 rounded-lg bg-muted p-0.5", className)}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex flex-1 items-center justify-center rounded-md border font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              size === "sm" ? "h-7 px-3 text-xs" : "h-8 px-3.5 text-[13px]",
              selected
                ? "border-border bg-card text-foreground shadow-xs"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
