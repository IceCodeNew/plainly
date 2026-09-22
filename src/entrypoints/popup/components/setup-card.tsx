import type { APIProviderConfig } from "@/types/config/provider"
import { useAtomValue, useSetAtom } from "jotai"
import { useId, useState } from "react"
import { i18n } from "#imports"
import { providerConfigAtom } from "@/utils/atoms/provider"
import { PROVIDER_ITEMS } from "@/utils/constants/providers"
import { openOptionsPage } from "@/utils/navigation"
import { activeTabAtom, pageTranslationEnabledAtom } from "../atoms"
import { setPageTranslation } from "./translate-button"

/**
 * First-run path: paste the key for the selected service right here and
 * translate, instead of leaving for the settings page.
 */
export function SetupCard({ providerConfig }: { providerConfig: APIProviderConfig }) {
  const inputId = useId()
  const [apiKey, setApiKey] = useState("")
  const [saving, setSaving] = useState(false)
  const setProviderConfig = useSetAtom(providerConfigAtom(providerConfig.id))
  const activeTab = useAtomValue(activeTabAtom)
  const setEnabled = useSetAtom(pageTranslationEnabledAtom)

  const providerName = PROVIDER_ITEMS[providerConfig.provider].name
  const canSave = apiKey.trim().length > 0 && !saving

  const saveAndTranslate = async () => {
    if (!canSave)
      return
    setSaving(true)
    try {
      // Persist before asking the page to translate: the content script reads
      // the key straight from storage.
      await setProviderConfig({ ...providerConfig, apiKey: apiKey.trim() })
      if (activeTab.id !== null && activeTab.translatable) {
        setEnabled(true)
        await setPageTranslation(activeTab.id, true)
      }
    }
    finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5"
      onSubmit={(event) => {
        event.preventDefault()
        void saveAndTranslate()
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="text-sm font-semibold leading-5">{i18n.t("popup.setup.title", [providerName])}</div>
        <div className="text-xs leading-[17px] text-muted-foreground">{i18n.t("popup.setup.description", [providerName])}</div>
      </div>
      <label htmlFor={inputId} className="mt-0.5 text-[11px] text-muted-foreground">API Key</label>
      <input
        id={inputId}
        type="password"
        autoComplete="off"
        spellCheck={false}
        placeholder={i18n.t("popup.setup.placeholder")}
        value={apiKey}
        onChange={event => setApiKey(event.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <button
        type="submit"
        disabled={!canSave}
        className="h-10 rounded-[9px] bg-primary text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/85 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {activeTab.translatable ? i18n.t("popup.setup.saveAndTranslate") : i18n.t("popup.setup.save")}
      </button>
      <button
        type="button"
        onClick={() => void openOptionsPage({ section: "providers" })}
        className="self-start text-xs text-link hover:underline"
      >
        {i18n.t("popup.setup.otherService")}
      </button>
    </form>
  )
}
