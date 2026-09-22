import { useAtom } from "jotai"
import { useMemo, useState } from "react"
import { i18n } from "#imports"
import { Button } from "@/components/ui/base-ui/button"
import { CSSCodeEditor } from "@/components/ui/css-code-editor"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { MAX_CUSTOM_CSS_LENGTH } from "@/types/config/translate"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import { lintCSS } from "@/utils/css/lint-css"
import { cn } from "@/utils/styles/utils"

/**
 * Custom CSS for translated nodes, validated as you type and saved on demand
 * so a half-typed rule never reaches the page.
 */
export function CSSEditor() {
  const [translateConfig, setTranslateConfig] = useAtom(configFieldsAtomMap.translate)
  const savedCss = translateConfig.translationNodeStyle.customCSS ?? ""
  const [cssInput, setCssInput] = useState(savedCss)
  const debouncedCssInput = useDebouncedValue(cssInput, 500)

  const syntaxCheck = useMemo(() => {
    if (!debouncedCssInput.trim()) {
      return { valid: true, errors: [] }
    }
    return lintCSS(debouncedCssInput)
  }, [debouncedCssInput])

  const hasLengthError = debouncedCssInput.length > MAX_CUSTOM_CSS_LENGTH
  const hasSyntaxError = !syntaxCheck.valid
  const isValidating = cssInput !== debouncedCssInput
  const hasChanges = cssInput !== savedCss
  const canSave = !isValidating && !hasSyntaxError && !hasLengthError && hasChanges

  const handleSave = () => {
    if (!canSave)
      return
    void setTranslateConfig({
      ...translateConfig,
      translationNodeStyle: {
        ...translateConfig.translationNodeStyle,
        customCSS: cssInput,
      },
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <CSSCodeEditor
        value={cssInput}
        onChange={setCssInput}
        hasError={hasSyntaxError || hasLengthError}
        placeholder={i18n.t("options.reading.style.cssPlaceholder")}
        className="min-h-[160px] max-h-[360px] overflow-y-auto"
      />
      <div className="flex items-center justify-between gap-2">
        <div className={cn("text-xs text-muted-foreground", (hasSyntaxError || hasLengthError) && "text-destructive")}>
          {cssInput.trim().length > 0 ? getValidationMessage(isValidating, hasSyntaxError, hasLengthError, hasChanges) : ""}
        </div>
        <Button size="sm" onClick={handleSave} disabled={!canSave}>
          {hasChanges ? i18n.t("options.reading.style.css.save") : i18n.t("options.reading.style.css.saved")}
        </Button>
      </div>
    </div>
  )
}

function getValidationMessage(isValidating: boolean, hasSyntaxError: boolean, hasLengthError: boolean, hasChanges: boolean) {
  if (isValidating)
    return i18n.t("options.reading.style.css.validating")
  if (hasSyntaxError)
    return i18n.t("options.reading.style.css.syntaxError")
  if (hasLengthError)
    return i18n.t("options.reading.style.css.tooLong")
  if (!hasChanges)
    return i18n.t("options.reading.style.css.allSaved")
  return i18n.t("options.reading.style.css.valid")
}
