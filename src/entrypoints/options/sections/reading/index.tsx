import { deepmerge } from "deepmerge-ts"
import { useAtom } from "jotai"
import { useId } from "react"
import { i18n } from "#imports"
import { SegmentedControl } from "@/components/segmented-control"
import { ShortcutKeyRecorder } from "@/components/shortcut-key-recorder"
import { Switch } from "@/components/ui/base-ui/switch"
import { pageTranslateRangeSchema, TRANSLATION_MODES } from "@/types/config/translate"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { DEFAULT_AUTO_TRANSLATE_SHORTCUT_KEY } from "@/utils/constants/translate"
import { SettingsGroup, SettingsRow, SettingsSection } from "../../components/settings-section"
import { StyleSetting } from "./style-setting"

const MODE_LABEL_KEY = {
  bilingual: "options.reading.mode.bilingual",
  translationOnly: "options.reading.mode.translationOnly",
} as const

const RANGE_LABEL_KEY = {
  main: "options.reading.range.main",
  all: "options.reading.range.all",
} as const

export function ReadingSection() {
  const [translateConfig, setTranslateConfig] = useAtom(configFieldsAtomMap.translate)
  const [readingConfig, setReadingConfig] = useAtom(configFieldsAtomMap.reading)
  const shortcutId = useId()
  const emphasisId = useId()

  return (
    <SettingsSection
      id="reading"
      title={i18n.t("options.reading.title")}
      description={i18n.t("options.reading.description")}
    >
      <SettingsGroup>
        <SettingsRow
          label={i18n.t("options.reading.mode.title")}
          control={(
            <SegmentedControl
              size="sm"
              aria-label={i18n.t("options.reading.mode.title")}
              value={translateConfig.mode}
              options={TRANSLATION_MODES.map(mode => ({ value: mode, label: i18n.t(MODE_LABEL_KEY[mode]) }))}
              onChange={mode => void setTranslateConfig({ mode })}
            />
          )}
        />
        <StyleSetting />
        <SettingsRow
          label={i18n.t("options.reading.wordPrefixEmphasis.title")}
          description={i18n.t("options.reading.wordPrefixEmphasis.description")}
          htmlFor={emphasisId}
          control={(
            <Switch
              id={emphasisId}
              checked={readingConfig.wordPrefixEmphasis}
              onCheckedChange={wordPrefixEmphasis => void setReadingConfig({ wordPrefixEmphasis })}
            />
          )}
        />
        <SettingsRow
          label={i18n.t("options.reading.range.title")}
          description={i18n.t("options.reading.range.description")}
          control={(
            <SegmentedControl
              size="sm"
              aria-label={i18n.t("options.reading.range.title")}
              value={translateConfig.page.range}
              options={pageTranslateRangeSchema.options.map(range => ({ value: range, label: i18n.t(RANGE_LABEL_KEY[range]) }))}
              onChange={range => void setTranslateConfig(deepmerge(translateConfig, { page: { range } }))}
            />
          )}
        />
        <SettingsRow
          label={i18n.t("options.reading.shortcut.title")}
          description={i18n.t("options.reading.shortcut.description")}
          htmlFor={shortcutId}
          control={(
            <ShortcutKeyRecorder
              id={shortcutId}
              className="w-28 text-center"
              shortcutKey={translateConfig.page.shortcut ?? DEFAULT_AUTO_TRANSLATE_SHORTCUT_KEY}
              onChange={shortcut => void setTranslateConfig({ ...translateConfig, page: { ...translateConfig.page, shortcut } })}
            />
          )}
        />
      </SettingsGroup>
    </SettingsSection>
  )
}
