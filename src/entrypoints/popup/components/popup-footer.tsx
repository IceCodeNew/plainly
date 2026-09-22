import type { ProviderConfig } from "@/types/config/provider"
import { Select as SelectPrimitive } from "@base-ui/react/select"
import { IconChevronDown, IconSettings } from "@tabler/icons-react"
import { useAtom, useAtomValue } from "jotai"
import { useMemo } from "react"
import { i18n } from "#imports"
import ProviderIcon from "@/components/provider-icon"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectValue,
} from "@/components/ui/base-ui/select"
import { isAPIProviderConfig, isLLMProviderConfig, isTranslateProvider } from "@/types/config/provider"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { filterEnabledProvidersConfig } from "@/utils/config/helpers"
import { PROVIDER_ITEMS } from "@/utils/constants/providers"
import { openOptionsPage } from "@/utils/navigation"
import { resolveModelId } from "@/utils/providers/model-id"
import { cn } from "@/utils/styles/utils"

function isProviderReady(provider: ProviderConfig): boolean {
  return !isAPIProviderConfig(provider) || !!provider.apiKey?.trim()
}

function describeProvider(provider: ProviderConfig): string {
  const modelId = isLLMProviderConfig(provider) ? resolveModelId(provider.model) : null
  const displayName = provider.name || PROVIDER_ITEMS[provider.provider].name
  return modelId ? `${displayName} · ${modelId}` : displayName
}

export function PopupFooter() {
  const [translateConfig, setTranslateConfig] = useAtom(configFieldsAtomMap.translate)
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)

  const providers = useMemo(
    () => filterEnabledProvidersConfig(providersConfig).filter(p => isTranslateProvider(p.provider)),
    [providersConfig],
  )
  const current = providers.find(p => p.id === translateConfig.providerId)

  return (
    <div className="flex items-center justify-between border-t border-border py-2 pr-2.5 pl-3">
      <Select<ProviderConfig>
        value={current}
        onValueChange={(provider) => {
          if (provider)
            void setTranslateConfig({ providerId: provider.id })
        }}
        itemToStringValue={p => p.id}
        disabled={providers.length === 0}
      >
        <SelectPrimitive.Trigger
          aria-label={i18n.t("popup.provider.switch")}
          className="flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1.5 text-xs text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            aria-hidden="true"
            className={cn("size-1.5 shrink-0 rounded-full", current && isProviderReady(current) ? "bg-emerald-600" : "bg-amber-600")}
          />
          <SelectValue className="min-w-0 truncate">
            {(provider: ProviderConfig) => (
              <span className="truncate">
                {isProviderReady(provider)
                  ? describeProvider(provider)
                  : `${provider.name} · ${i18n.t("popup.provider.missingKey")}`}
              </span>
            )}
          </SelectValue>
          <IconChevronDown className="size-3 shrink-0" aria-hidden="true" />
        </SelectPrimitive.Trigger>
        <SelectContent className="min-w-fit" align="start">
          <SelectGroup>
            {providers.map(provider => (
              <SelectItem key={provider.id} value={provider}>
                <ProviderIcon providerType={provider.provider} name={describeProvider(provider)} size="sm" />
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <button
        type="button"
        aria-label={i18n.t("popup.settings")}
        title={i18n.t("popup.settings")}
        onClick={() => void openOptionsPage()}
        className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <IconSettings className="size-4" stroke={1.75} />
      </button>
    </div>
  )
}
