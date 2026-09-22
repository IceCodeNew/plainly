import type { APIProviderTypes } from "@/types/config/provider"
import { IconPlus } from "@tabler/icons-react"
import { useAtom, useSetAtom } from "jotai"
import { useState } from "react"
import { i18n } from "#imports"
import ProviderIcon from "@/components/provider-icon"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/base-ui/popover"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { ADDABLE_PROVIDER_TYPES } from "@/utils/constants/providers"
import { expandedProviderIdAtom } from "./atoms"
import { addProvider } from "./utils"

const CHOICE_LABEL_KEY = {
  "openai": "options.providers.addChoice.openai",
  "deepseek": "options.providers.addChoice.deepseek",
  "openai-compatible": "options.providers.addChoice.openaiCompatible",
} as const satisfies Record<APIProviderTypes, string>

export function AddProviderMenu() {
  const [open, setOpen] = useState(false)
  const [providersConfig, setProvidersConfig] = useAtom(configFieldsAtomMap.providersConfig)
  const setExpandedId = useSetAtom(expandedProviderIdAtom)

  const handleAdd = async (providerType: APIProviderTypes) => {
    setOpen(false)
    await addProvider(providerType, providersConfig, setProvidersConfig, setExpandedId)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={(
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-3 text-left text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        )}
      >
        <IconPlus className="size-3.5" aria-hidden="true" />
        <span>{i18n.t("options.providers.add")}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-1">
        {ADDABLE_PROVIDER_TYPES.map(providerType => (
          <button
            key={providerType}
            type="button"
            onClick={() => void handleAdd(providerType)}
            className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
          >
            <ProviderIcon providerType={providerType} name={i18n.t(CHOICE_LABEL_KEY[providerType])} size="sm" />
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
