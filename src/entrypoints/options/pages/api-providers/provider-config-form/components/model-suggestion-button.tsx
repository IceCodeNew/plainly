import type { LLMProviderConfig } from "@/types/config/provider"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { Icon } from "@iconify/react"
import { useMutation } from "@tanstack/react-query"
import { z } from "zod"
import { i18n } from "#imports"
import LoadingDots from "@/components/loading-dots"
import { Button } from "@/components/ui/base-ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/base-ui/combobox"
import { extractErrorMessage } from "@/utils/error/extract-message"
import { getProviderHeadersWithOverride } from "@/utils/providers/headers"

const modelsResponseSchema = z.object({
  data: z.array(z.object({ id: z.string().trim().min(1) })),
})

interface ModelSuggestionButtonProps {
  providerConfig: LLMProviderConfig
  onSelect: (model: string) => void
}

export function ModelSuggestionButton({ providerConfig, onSelect }: ModelSuggestionButtonProps) {
  const defaults = { "openai": "https://api.openai.com/v1", "deepseek": "https://api.deepseek.com", "openai-compatible": "" }
  const baseURL = (providerConfig.baseURL?.trim() || defaults[providerConfig.provider]).replace(/\/+$/, "")
  const headers = getProviderHeadersWithOverride(providerConfig.provider, providerConfig.headers)
  return (
    <ModelSuggestions
      key={JSON.stringify([providerConfig.id, providerConfig.provider, baseURL, providerConfig.apiKey, Object.entries(headers ?? {}).sort(([a], [b]) => a.localeCompare(b))])}
      baseURL={baseURL}
      apiKey={providerConfig.apiKey}
      headers={headers}
      onSelect={onSelect}
    />
  )
}

interface ModelSuggestionsProps {
  baseURL: string
  apiKey?: string
  headers?: Record<string, string>
  onSelect: (model: string) => void
}

function ModelSuggestions({
  baseURL,
  apiKey,
  headers,
  onSelect,
}: ModelSuggestionsProps) {
  const mutation = useMutation({
    mutationKey: ["fetchModels", baseURL],
    meta: {
      errorDescription: i18n.t("options.apiProviders.form.models.fetchError"),
    },
    mutationFn: async () => {
      const requestHeaders = new Headers(headers)
      if (apiKey && !requestHeaders.has("Authorization")) {
        requestHeaders.set("Authorization", `Bearer ${apiKey}`)
      }

      const response = await fetch(`${baseURL}/models`, {
        headers: requestHeaders,
        signal: AbortSignal.timeout(15000),
      })
      if (!response.ok) {
        throw new Error(await extractErrorMessage(response))
      }

      const result = modelsResponseSchema.safeParse(await response.json())
      if (!result.success) {
        throw new Error(i18n.t("options.apiProviders.form.models.fetchError"))
      }
      return [...new Set(result.data.data.map(model => model.id))].sort()
    },
  })

  const models = mutation.data ?? []
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => {
          mutation.reset()
          mutation.mutate()
        }}
        disabled={!baseURL || mutation.isPending}
        className={mutation.isError ? "text-red-500 hover:text-red-500" : undefined}
      >
        {mutation.isPending
          ? <LoadingDots className="scale-75" />
          : <Icon icon={mutation.isError ? "tabler:alert-circle" : "tabler:list-search"} className="size-3.5" />}
        {mutation.isError
          ? i18n.t("options.apiProviders.form.models.clickToRetry")
          : i18n.t("options.apiProviders.form.models.fetchModels")}
      </Button>
      {mutation.isSuccess && (models.length === 0
        ? <span role="status" className="text-xs text-muted-foreground">{i18n.t("options.apiProviders.form.models.noModels")}</span>
        : (
            <Combobox
              items={models}
              defaultOpen
              onValueChange={(model: string | null) => {
                if (model)
                  onSelect(model)
              }}
            >
              <ComboboxPrimitive.Trigger render={<Button type="button" variant="outline" size="xs" />}>
                <Icon icon="tabler:list" />
                {i18n.t("options.apiProviders.form.models.selectModel")}
              </ComboboxPrimitive.Trigger>
              <ComboboxContent align="end" className="w-64">
                <ComboboxInput showTrigger={false} aria-label={i18n.t("options.apiProviders.form.models.searchModels")} placeholder={i18n.t("options.apiProviders.form.models.searchModels")} />
                <ComboboxList>
                  {(model: string) => (
                    <ComboboxItem key={model} value={model}>
                      {model}
                    </ComboboxItem>
                  )}
                </ComboboxList>
                <ComboboxEmpty>{i18n.t("options.apiProviders.form.models.noModelsFound")}</ComboboxEmpty>
              </ComboboxContent>
            </Combobox>
          ))}
    </div>
  )
}
