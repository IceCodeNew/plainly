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
      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer">
        <IconChevronRight
          className={cn(
            "size-4 transition-transform duration-200",
            isOpen && "rotate-90",
          )}
          aria-hidden="true"
        />
        <span>{i18n.t("options.apiProviders.form.advancedOptions")}</span>
      </CollapsibleTrigger>
      <CollapsibleContent keepMounted>
        <FieldGroup className="pt-4">
          {children}
        </FieldGroup>
      </CollapsibleContent>
    </Collapsible>
  )
}
