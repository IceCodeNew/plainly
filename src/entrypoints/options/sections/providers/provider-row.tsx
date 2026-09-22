import type { APIProviderConfig } from "@/types/config/provider"
import { IconChevronDown } from "@tabler/icons-react"
import { useAtom, useAtomValue, useSetAtom } from "jotai"
import { useId } from "react"
import { i18n } from "#imports"
import { isLLMProviderConfig } from "@/types/config/provider"
import { configAtom, writeConfigAtom } from "@/utils/atoms/config"
import { buildFeatureProviderPatch } from "@/utils/constants/feature-providers"
import { PROVIDER_ITEMS } from "@/utils/constants/providers"
import { resolveModelId } from "@/utils/providers/model-id"
import { cn } from "@/utils/styles/utils"
import { expandedProviderIdAtom } from "./atoms"
import { ProviderForm } from "./form"

function hasApiKey(providerConfig: APIProviderConfig): boolean {
  return !!providerConfig.apiKey?.trim()
}

export function ProviderRow({ providerConfig }: { providerConfig: APIProviderConfig }) {
  const radioId = useId()
  const config = useAtomValue(configAtom)
  const setConfig = useSetAtom(writeConfigAtom)
  const [expandedId, setExpandedId] = useAtom(expandedProviderIdAtom)

  const isActive = config.translate.providerId === providerConfig.id
  const isExpanded = expandedId === providerConfig.id
  const modelId = isLLMProviderConfig(providerConfig) ? resolveModelId(providerConfig.model) : null
  const keyConfigured = hasApiKey(providerConfig)

  const activate = () => {
    if (isActive)
      return
    const patch = buildFeatureProviderPatch({ translate: providerConfig.id })
    if (providerConfig.enabled) {
      void setConfig(patch)
      return
    }
    void setConfig({
      ...patch,
      providersConfig: config.providersConfig.map(provider =>
        provider.id === providerConfig.id ? { ...provider, enabled: true } : provider,
      ),
    })
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3">
        <input
          type="radio"
          id={radioId}
          name="translate-provider"
          checked={isActive}
          onChange={activate}
          aria-label={i18n.t("options.providers.useForTranslation", [providerConfig.name])}
          className="size-4 shrink-0 cursor-pointer accent-primary"
        />
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setExpandedId(isExpanded ? null : providerConfig.id)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-md text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="truncate text-sm font-semibold">{providerConfig.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {modelId ?? PROVIDER_ITEMS[providerConfig.provider].name}
          </span>
          <IconChevronDown
            aria-hidden="true"
            className={cn("ml-auto size-3.5 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")}
          />
        </button>
        <span className={cn("flex shrink-0 items-center gap-1.5 text-xs", keyConfigured ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
          <span aria-hidden="true" className={cn("size-1.5 rounded-full", keyConfigured ? "bg-emerald-600" : "bg-amber-600")} />
          {keyConfigured ? i18n.t("options.providers.keyConfigured") : i18n.t("options.providers.keyMissing")}
        </span>
      </div>
      {isExpanded && (
        <div className="px-4 pt-1 pb-4 pl-11">
          <ProviderForm key={providerConfig.id} providerId={providerConfig.id} />
        </div>
      )}
    </div>
  )
}
