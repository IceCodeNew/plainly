import type { ThemeMode } from "@/types/config/theme"
import { useSetAtom } from "jotai"
import { i18n } from "#imports"
import { useTheme } from "@/components/providers/theme-provider"
import { SegmentedControl } from "@/components/segmented-control"
import { themeModes } from "@/types/config/theme"
import { writeConfigAtom } from "@/utils/atoms/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { ConfirmAction } from "../components/confirm-action"

const THEME_LABEL_KEY = {
  system: "options.appearance.system",
  light: "options.appearance.light",
  dark: "options.appearance.dark",
} as const satisfies Record<ThemeMode, string>

export function SettingsFooter() {
  const { themeMode, setThemeMode } = useTheme()
  const setConfig = useSetAtom(writeConfigAtom)

  return (
    <div className="flex items-center justify-between border-t border-border pt-5">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground">{i18n.t("options.appearance.title")}</span>
        <SegmentedControl
          size="sm"
          aria-label={i18n.t("options.appearance.title")}
          value={themeMode}
          options={themeModes.map(mode => ({ value: mode, label: i18n.t(THEME_LABEL_KEY[mode]) }))}
          onChange={setThemeMode}
        />
      </div>
      <ConfirmAction
        trigger={(
          <button type="button" className="text-xs text-destructive hover:underline">
            {i18n.t("options.reset.title")}
          </button>
        )}
        title={i18n.t("options.reset.dialog.title")}
        description={i18n.t("options.reset.dialog.description")}
        confirmLabel={i18n.t("options.reset.dialog.confirm")}
        cancelLabel={i18n.t("options.reset.dialog.cancel")}
        onConfirm={() => setConfig(DEFAULT_CONFIG)}
      />
    </div>
  )
}
