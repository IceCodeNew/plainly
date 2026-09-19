import type { APIProviderConfig } from "@/types/config/provider"
import { useStore } from "@tanstack/react-form"
import { i18n } from "#imports"
import { isLLMProviderConfig } from "@/types/config/provider"
import { resolveModelId } from "@/utils/providers/model-id"
import { ModelSuggestionButton } from "./components/model-suggestion-button"
import { ProviderOptionsRecommendationTrigger } from "./components/provider-options-recommendation-trigger"
import { withForm } from "./form"

export const TranslateModelSelector = withForm({
  ...{ defaultValues: {} as APIProviderConfig },
  render: function Render({ form }) {
    const providerConfig = useStore(form.store, state => state.values)
    if (!isLLMProviderConfig(providerConfig))
      return <></>

    const modelId = resolveModelId(providerConfig.model)
    const setModel = (customModel: string) => {
      form.setFieldValue("model", { ...providerConfig.model, isCustomModel: true, customModel })
      void form.handleSubmit()
    }

    return (
      <form.AppField name="model.customModel">
        {field => (
          <field.InputFieldAutoSave
            formForSubmit={form}
            label={i18n.t("options.general.translationConfig.model.title")}
            aria-label={i18n.t("options.general.translationConfig.model.title")}
            labelExtra={(
              <div className="flex flex-wrap items-center justify-end gap-2">
                <ProviderOptionsRecommendationTrigger
                  providerId={providerConfig.id}
                  modelId={modelId}
                  currentProviderOptions={providerConfig.providerOptions}
                  onApply={(options) => {
                    form.setFieldValue("providerOptions", options)
                    void form.handleSubmit()
                  }}
                />
                <ModelSuggestionButton providerConfig={providerConfig} onSelect={setModel} />
              </div>
            )}
            value={providerConfig.model.isCustomModel ? providerConfig.model.customModel ?? "" : providerConfig.model.model}
            onChange={event => setModel(event.target.value)}
          />
        )}
      </form.AppField>
    )
  },
})
