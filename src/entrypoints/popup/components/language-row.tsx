import type { LanguageItem } from "@/components/language-combobox-options"
import type { LangCodeISO6393 } from "@/definitions"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { IconArrowRight } from "@tabler/icons-react"
import { useAtom, useAtomValue } from "jotai"
import { useMemo } from "react"
import { i18n } from "#imports"
import { filterLanguage } from "@/components/language-combobox-options"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/base-ui/combobox"
import { langCodeISO6393Schema } from "@/definitions"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { detectedCodeAtom } from "@/utils/atoms/detected-code"
import { getLanguageLabel, getLanguageName } from "@/utils/language-labels"
import { cn } from "@/utils/styles/utils"

function createLanguageItem(code: LangCodeISO6393): LanguageItem<LangCodeISO6393> {
  return {
    value: code,
    label: getLanguageLabel(code),
    name: getLanguageName(code),
  }
}

function LanguageTrigger({ title, caption, ariaLabel }: { title: string, caption: string, ariaLabel: string }) {
  return (
    <ComboboxPrimitive.Trigger
      aria-label={ariaLabel}
      title={title}
      className="flex h-11 min-w-0 flex-1 cursor-pointer flex-col justify-center gap-0.5 rounded-[10px] border border-border bg-card px-3 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="w-full truncate text-sm font-semibold leading-[18px]">{title}</span>
      <span className="text-[11px] leading-[14px] text-muted-foreground">{caption}</span>
    </ComboboxPrimitive.Trigger>
  )
}

export function LanguageRow({ muted = false }: { muted?: boolean }) {
  const [language, setLanguage] = useAtom(configFieldsAtomMap.language)
  const detectedCode = useAtomValue(detectedCodeAtom)

  const targetItems = useMemo(() => langCodeISO6393Schema.options.map(createLanguageItem), [])
  const sourceItems = useMemo<LanguageItem[]>(() => [
    { value: "auto", label: getLanguageLabel(detectedCode), name: getLanguageName(detectedCode) },
    ...targetItems,
  ], [detectedCode, targetItems])

  const currentSource = sourceItems.find(item => item.value === language.sourceCode) ?? sourceItems[0]
  const currentTarget = targetItems.find(item => item.value === language.targetCode) ?? null

  const sourceCode = language.sourceCode
  const isAuto = sourceCode === "auto"
  const sourceTitle = sourceCode === "auto" ? getLanguageName(detectedCode) : getLanguageName(sourceCode)
  const targetTitle = currentTarget?.name ?? getLanguageLabel(language.targetCode)

  return (
    <div className={cn("flex items-center gap-2", muted && "opacity-60")}>
      <Combobox
        value={currentSource}
        onValueChange={(item: LanguageItem | null) => {
          if (item && item.value !== language.sourceCode)
            void setLanguage({ sourceCode: item.value })
        }}
        items={sourceItems}
        filter={filterLanguage}
        autoHighlight
      >
        <LanguageTrigger
          title={sourceTitle}
          caption={isAuto ? i18n.t("popup.autoDetected") : i18n.t("popup.sourceLanguage")}
          ariaLabel={i18n.t("popup.sourceLanguage")}
        />
        <ComboboxContent className="w-72 rounded-lg shadow-md">
          <ComboboxInput showTrigger={false} placeholder={i18n.t("languageCombobox.searchLanguages")} />
          <ComboboxList>
            {(item: LanguageItem) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
                {item.value === "auto" && (
                  <span className="ml-auto rounded-full bg-muted px-1.5 text-[10px] text-muted-foreground">
                    {i18n.t("popup.auto")}
                  </span>
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>{i18n.t("languageCombobox.noLanguagesFound")}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
      <IconArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Combobox
        value={currentTarget}
        onValueChange={(item: LanguageItem | null) => {
          if (item && item.value !== "auto" && item.value !== language.targetCode)
            void setLanguage({ targetCode: item.value })
        }}
        items={targetItems}
        filter={filterLanguage}
        autoHighlight
      >
        <LanguageTrigger
          title={targetTitle}
          caption={i18n.t("popup.translateInto")}
          ariaLabel={i18n.t("popup.targetLanguage")}
        />
        <ComboboxContent className="w-72 rounded-lg shadow-md">
          <ComboboxInput showTrigger={false} placeholder={i18n.t("languageCombobox.searchLanguages")} />
          <ComboboxList>
            {(item: LanguageItem<LangCodeISO6393>) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
          <ComboboxEmpty>{i18n.t("languageCombobox.noLanguagesFound")}</ComboboxEmpty>
        </ComboboxContent>
      </Combobox>
    </div>
  )
}
