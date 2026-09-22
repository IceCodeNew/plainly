import type { ReactNode } from "react"
import { cn } from "@/utils/styles/utils"

export function SettingsSection({ id, title, description, children, className }: {
  id: string
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section id={id} className={cn("flex scroll-mt-8 flex-col gap-3.5", className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-[15px] font-semibold">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Card that stacks settings rows separated by hairlines. */
export function SettingsGroup({ children, className }: { children: ReactNode, className?: string }) {
  return (
    <div className={cn("flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card", className)}>
      {children}
    </div>
  )
}

export function SettingsRow({ label, description, htmlFor, control, children, className }: {
  label: ReactNode
  description?: ReactNode
  htmlFor?: string
  /** Control rendered on the right of the label. */
  control?: ReactNode
  /** Content rendered below the label row, full width. */
  children?: ReactNode
  className?: string
}) {
  const LabelTag = htmlFor ? "label" : "div"

  return (
    <div className={cn("flex flex-col gap-3 px-4 py-3.5", className)}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <LabelTag htmlFor={htmlFor} className="text-[13px] font-medium">{label}</LabelTag>
          {description && <div className="text-xs text-muted-foreground">{description}</div>}
        </div>
        {control && <div className="shrink-0">{control}</div>}
      </div>
      {children}
    </div>
  )
}
