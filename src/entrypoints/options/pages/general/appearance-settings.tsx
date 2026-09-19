import type { Icon as TablerIcon } from "@tabler/icons-react"
import type { ThemeMode } from "@/types/config/theme"
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react"
import { i18n } from "#imports"
import { useTheme } from "@/components/providers/theme-provider"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/base-ui/select"
import { themeModes } from "@/types/config/theme"
import { ConfigCard } from "../../components/config-card"

const MODE_ICON: Record<ThemeMode, TablerIcon> = {
  system: IconDeviceDesktop,
  light: IconSun,
  dark: IconMoon,
}

const MODE_LABEL_KEY = {
  system: "options.general.appearance.system",
  light: "options.general.appearance.light",
  dark: "options.general.appearance.dark",
} as const

export default function AppearanceSettings() {
  const { themeMode, setThemeMode } = useTheme()
  const CurrentModeIcon = MODE_ICON[themeMode]

  return (
    <ConfigCard
      id="appearance"
      title={i18n.t("options.general.appearance.title")}
      description={i18n.t("options.general.appearance.theme")}
    >
      <div className="w-full flex justify-start md:justify-end">
        <Select
          value={themeMode}
          onValueChange={value => setThemeMode(value as ThemeMode)}
        >
          <SelectTrigger className="w-full">
            <SelectValue render={<span />}>
              <span className="flex items-center gap-2">
                <CurrentModeIcon className="size-4" aria-hidden="true" />
                {i18n.t(MODE_LABEL_KEY[themeMode])}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {themeModes.map((mode) => {
                const ModeIcon = MODE_ICON[mode]
                return (
                  <SelectItem key={mode} value={mode}>
                    <span className="flex items-center gap-2">
                      <ModeIcon className="size-4" aria-hidden="true" />
                      {i18n.t(MODE_LABEL_KEY[mode])}
                    </span>
                  </SelectItem>
                )
              })}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </ConfigCard>
  )
}
