import { deepmerge } from "deepmerge-ts"
import { useAtom } from "jotai"
import { useId } from "react"
import { i18n } from "#imports"
import { PromptConfigurator } from "@/components/prompt-configurator"
import { createPromptAtoms } from "@/components/prompt-configurator/create-atoms"
import { Switch } from "@/components/ui/base-ui/switch"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { getTokenCellText, WEB_PAGE_PROMPT_TOKENS } from "@/utils/constants/prompt"
import { SettingsGroup, SettingsRow, SettingsSection } from "../../components/settings-section"

const promptAtoms = createPromptAtoms(configFieldsAtomMap.translate)

export function QualitySection() {
  const [translateConfig, setTranslateConfig] = useAtom(configFieldsAtomMap.translate)
  const contextSwitchId = useId()

  const insertCells = WEB_PAGE_PROMPT_TOKENS.map(token => ({
    text: getTokenCellText(token),
    description: i18n.t(`options.quality.prompts.tokens.${token}`),
  }))

  return (
    <SettingsSection
      id="quality"
      title={i18n.t("options.quality.title")}
      description={i18n.t("options.quality.description")}
    >
      <SettingsGroup>
        <SettingsRow
          label={i18n.t("options.quality.context.title")}
          description={i18n.t("options.quality.context.description")}
          htmlFor={contextSwitchId}
          control={(
            <Switch
              id={contextSwitchId}
              checked={translateConfig.enableAIContentAware}
              onCheckedChange={checked => void setTranslateConfig(deepmerge(translateConfig, { enableAIContentAware: checked }))}
            />
          )}
        />
        <PromptConfigurator promptAtoms={promptAtoms} insertCells={insertCells} />
      </SettingsGroup>
    </SettingsSection>
  )
}
