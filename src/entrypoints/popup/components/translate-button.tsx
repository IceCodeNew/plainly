import { useAtom, useAtomValue } from "jotai"
import { i18n } from "#imports"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { sendMessage } from "@/utils/message"
import { formatHotkey } from "@/utils/os"
import { isPageTranslationShortcutEmpty } from "@/utils/page-translation-shortcut"
import { cn } from "@/utils/styles/utils"
import { activeTabAtom, pageTranslationEnabledAtom, translationProgressAtom } from "../atoms"

export async function setPageTranslation(tabId: number, enabled: boolean) {
  await sendMessage("tryToSetEnablePageTranslationByTabId", { tabId, enabled })
}

function ProgressLine() {
  const progress = useAtomValue(translationProgressAtom)
  if (!progress || progress.total === 0)
    return null

  const finished = progress.done >= progress.total
  const ratio = Math.min(1, progress.done / progress.total)

  return (
    <div className="flex flex-col gap-1.5 px-0.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {finished ? i18n.t("popup.translated") : i18n.t("popup.translating")}
          {progress.failed > 0 && ` · ${i18n.t("popup.failedCount", [String(progress.failed)])}`}
        </span>
        <span className="tabular-nums">
          {finished
            ? i18n.t("popup.paragraphCount", [String(progress.total)])
            : `${progress.done} / ${progress.total}`}
        </span>
      </div>
      <div aria-hidden="true" className="h-0.5 overflow-hidden rounded-full bg-border">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", finished ? "bg-muted-foreground/50" : "bg-brand")}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  )
}

export function TranslateButton() {
  const activeTab = useAtomValue(activeTabAtom)
  const [enabled, setEnabled] = useAtom(pageTranslationEnabledAtom)
  const translateConfig = useAtomValue(configFieldsAtomMap.translate)

  const shortcut = translateConfig.page.shortcut
  const shortcutHint = isPageTranslationShortcutEmpty(shortcut) ? null : formatHotkey(shortcut)

  const toggle = () => {
    if (activeTab.id === null)
      return
    const next = !enabled
    setEnabled(next)
    void setPageTranslation(activeTab.id, next)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={!activeTab.translatable}
        className={cn(
          "flex h-11 items-center justify-between rounded-[10px] px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          enabled
            ? "border border-foreground bg-card text-foreground hover:bg-muted/60"
            : "bg-primary text-primary-foreground hover:bg-primary/85",
        )}
      >
        <span>{enabled ? i18n.t("popup.showOriginal") : i18n.t("popup.translate")}</span>
        {shortcutHint && (
          <span className={cn("text-[11px] font-normal tracking-wide", enabled ? "text-muted-foreground" : "text-primary-foreground/60")}>
            {shortcutHint}
          </span>
        )}
      </button>
      {!activeTab.translatable && (
        <p className="px-0.5 text-xs text-muted-foreground">{i18n.t("popup.notTranslatable")}</p>
      )}
      {enabled && <ProgressLine />}
    </div>
  )
}
