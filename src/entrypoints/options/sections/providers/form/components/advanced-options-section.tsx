import type { ReactNode } from "react"
import { IconChevronRight } from "@tabler/icons-react"
import { useState } from "react"
import { i18n } from "#imports"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/base-ui/collapsible"
import { FieldGroup } from "@/components/ui/base-ui/field"
import { cn } from "@/utils/styles/utils"

interface AdvancedOptionsSectionProps {
  children: ReactNode
}

export function AdvancedOptionsSection({ children }: AdvancedOptionsSectionProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <IconChevronRight
          className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-90")}
        />
        <span>{i18n.t("options.providers.form.advanced")}</span>
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted>
        <FieldGroup className="pt-4">
          {children}
        </FieldGroup>
      </CollapsibleContent>
    </Collapsible>
  )
}
