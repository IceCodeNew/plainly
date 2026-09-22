import { useAtomValue } from "jotai"
import { i18n } from "#imports"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { getAPIProvidersConfig } from "@/utils/config/helpers"
import { SettingsGroup, SettingsSection } from "../../components/settings-section"
import { AddProviderMenu } from "./add-provider-menu"
import { ProviderRow } from "./provider-row"

export function ProvidersSection() {
  const providersConfig = useAtomValue(configFieldsAtomMap.providersConfig)
  const apiProviders = getAPIProvidersConfig(providersConfig)

  return (
    <SettingsSection
      id="providers"
      title={i18n.t("options.providers.title")}
      description={i18n.t("options.providers.description")}
    >
      <SettingsGroup>
        {apiProviders.map(providerConfig => (
          <ProviderRow key={providerConfig.id} providerConfig={providerConfig} />
        ))}
        <AddProviderMenu />
      </SettingsGroup>
    </SettingsSection>
  )
}
