import { useAtom } from "jotai"
import { i18n } from "#imports"
import { Switch } from "@/components/ui/base-ui/switch"
import { configFieldsAtomMap } from "@/utils/atoms/config"

export function WordPrefixEmphasis() {
  const [reading, setReading] = useAtom(configFieldsAtomMap.reading)
  return (
    <div className="border-t pt-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="word-prefix-emphasis" className="text-sm font-medium">
          {i18n.t("popup.wordPrefixEmphasis.title")}
        </label>
        <Switch
          id="word-prefix-emphasis"
          aria-describedby="word-prefix-description"
          checked={reading.wordPrefixEmphasis}
          onCheckedChange={(wordPrefixEmphasis) => { void setReading({ wordPrefixEmphasis }) }}
        />
      </div>
      <p id="word-prefix-description" className="text-muted-foreground mt-2 text-xs leading-relaxed">
        {i18n.t("popup.wordPrefixEmphasis.description")}
      </p>
    </div>
  )
}
