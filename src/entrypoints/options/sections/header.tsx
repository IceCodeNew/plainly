import { i18n } from "#imports"
import { version } from "../../../../package.json"

const REPOSITORY_URL = "https://github.com/Xuanwo/plainly"

export function SettingsHeader() {
  return (
    <div className="flex items-baseline justify-between">
      <h1 className="text-[22px] font-bold tracking-tight">{i18n.t("options.title")}</h1>
      <span className="text-xs text-muted-foreground">
        {`${i18n.t("name")} ${version} · `}
        <a href={REPOSITORY_URL} target="_blank" rel="noreferrer" className="text-link hover:underline">GitHub</a>
      </span>
    </div>
  )
}
