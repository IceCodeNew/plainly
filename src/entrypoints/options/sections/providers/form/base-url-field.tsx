import type { APIProviderConfig } from "@/types/config/provider"

import { useStore } from "@tanstack/react-form"
import { i18n } from "#imports"
import { isNonCustomLLMProvider } from "@/types/config/provider"
import { withForm } from "./form"

export const BaseURLField = withForm({
  ...{ defaultValues: {} as APIProviderConfig },
  render: function Render({ form }) {
    const providerConfig = useStore(form.store, state => state.values)
    const providerType = providerConfig.provider

    const isOptionalBaseURL = isNonCustomLLMProvider(providerType)
    const labelText = `${i18n.t("options.providers.form.baseURL")}${isOptionalBaseURL
      ? ` (${i18n.t("options.providers.form.optional")})`
      : ""}`

    return (
      <form.AppField name="baseURL">
        {field => (
          <field.InputFieldAutoSave
            formForSubmit={form}
            label={labelText}
            labelExtra={undefined}
          />
        )}
      </form.AppField>
    )
  },
})
