import type { TranslatePromptObj } from "@/types/config/translate"
import { useAtom } from "jotai"
import { useId } from "react"
import { i18n } from "#imports"
import { DEFAULT_TRANSLATE_PROMPT, DEFAULT_TRANSLATE_PROMPT_ID, DEFAULT_TRANSLATE_SYSTEM_PROMPT } from "@/utils/constants/prompt"
import { cn } from "@/utils/styles/utils"
import { ConfigurePrompt } from "./configure-prompt"
import { usePromptAtoms } from "./context"
import { DeletePrompt } from "./delete-prompt"
import { ExportPrompts } from "./export-prompts"
import { ImportPrompts } from "./import-prompts"

/**
 * Prompts as a radio list: the default one first, then the reader's own.
 * The chosen prompt is what page translation sends to the model.
 */
export function PromptList() {
  const promptAtoms = usePromptAtoms()
  const [config, setConfig] = useAtom(promptAtoms.config)
  const radioGroupId = useId()

  const defaultPrompt: TranslatePromptObj = {
    id: DEFAULT_TRANSLATE_PROMPT_ID,
    name: i18n.t("options.quality.prompts.default"),
    systemPrompt: DEFAULT_TRANSLATE_SYSTEM_PROMPT,
    prompt: DEFAULT_TRANSLATE_PROMPT,
  }
  const prompts = [defaultPrompt, ...config.patterns]

  const select = (prompt: TranslatePromptObj) => {
    setConfig({
      ...config,
      promptId: prompt.id === DEFAULT_TRANSLATE_PROMPT_ID ? null : prompt.id,
    })
  }

  return (
    <div className="flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <div className="text-[13px] font-medium">{i18n.t("options.quality.prompts.title")}</div>
        <div className="flex items-center gap-3 text-xs">
          <ImportPrompts />
          <ExportPrompts />
          <ConfigurePrompt />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        {prompts.map((prompt) => {
          const isDefault = prompt.id === DEFAULT_TRANSLATE_PROMPT_ID
          const isActive = isDefault ? config.promptId === null : config.promptId === prompt.id
          const inputId = `${radioGroupId}-${prompt.id}`

          return (
            <div
              key={prompt.id}
              className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2", isActive && "bg-muted")}
            >
              <input
                type="radio"
                id={inputId}
                name={radioGroupId}
                checked={isActive}
                onChange={() => select(prompt)}
                className="size-3.5 cursor-pointer accent-primary"
              />
              <label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer truncate text-[13px]" title={prompt.name}>
                {prompt.name}
              </label>
              <div className="flex shrink-0 items-center gap-3 text-xs">
                {!isDefault && <DeletePrompt originPrompt={prompt} />}
                <ConfigurePrompt originPrompt={prompt} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
