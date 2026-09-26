import type { JSONValue } from "ai"
import type { LLMProviderTypes } from "@/types/config/provider"
import { IconSparkles } from "@tabler/icons-react"
import { dequal } from "dequal"
import { useState } from "react"
import { i18n } from "#imports"
import { Button } from "@/components/ui/base-ui/button"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/base-ui/popover"
import { JSONCodeEditor } from "@/components/ui/json-code-editor"
import { getRecommendedProviderOptions } from "@/utils/providers/options"

interface ProviderOptionsRecommendationTriggerProps {
  provider: LLMProviderTypes
  currentProviderOptions?: Record<string, JSONValue>
  onApply: (options: Record<string, JSONValue>) => void
}

export function ProviderOptionsRecommendationTrigger({
  provider,
  currentProviderOptions,
  onApply,
}: ProviderOptionsRecommendationTriggerProps) {
  const [open, setOpen] = useState(false)
  const recommendation = getRecommendedProviderOptions(provider)
  if (!recommendation) {
    return null
  }

  const isApplied = !!currentProviderOptions && dequal(currentProviderOptions, recommendation)

  const handleApply = () => {
    onApply(recommendation)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={i18n.t("options.providers.form.providerOptionsRecommendationTrigger")}
            className="text-muted-foreground hover:text-foreground transition-colors"
          />
        )}
      >
        <IconSparkles className="size-3.5" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 gap-3">
        <PopoverHeader>
          <PopoverTitle>{i18n.t("options.providers.form.providerOptionsRecommendationTitle")}</PopoverTitle>
          <PopoverDescription>{i18n.t("options.providers.form.providerOptionsRecommendationDescription")}</PopoverDescription>
        </PopoverHeader>
        <JSONCodeEditor
          value={JSON.stringify(recommendation, null, 2)}
          editable={false}
          height="132px"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant={isApplied ? "secondary" : "default"}
            disabled={isApplied}
            onClick={handleApply}
          >
            {isApplied
              ? i18n.t("options.providers.form.providerOptionsRecommendationApplied")
              : i18n.t("options.providers.form.providerOptionsRecommendationApply")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
