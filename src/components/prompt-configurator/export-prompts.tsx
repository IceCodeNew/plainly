import { useAtomValue } from "jotai"
import { i18n } from "#imports"
import { usePromptAtoms } from "./context"
import { downloadJSONFile } from "./utils/prompt-file"

/** Downloads every custom prompt as one JSON file. */
export function ExportPrompts() {
  const promptAtoms = usePromptAtoms()
  const config = useAtomValue(promptAtoms.config)
  const exportable = config.patterns.map(({ id: _id, ...pattern }) => pattern)

  return (
    <button
      type="button"
      disabled={exportable.length === 0}
      onClick={() => downloadJSONFile(exportable)}
      className="cursor-pointer text-muted-foreground hover:text-foreground hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline"
    >
      {i18n.t("options.quality.prompts.export")}
    </button>
  )
}
