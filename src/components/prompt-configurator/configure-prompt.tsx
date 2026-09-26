import type { TranslatePromptObj } from "@/types/config/translate"
import { useAtom } from "jotai"
import { useState } from "react"
import { i18n } from "#imports"
import { Button } from "@/components/ui/base-ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/base-ui/field"
import { Input } from "@/components/ui/base-ui/input"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/base-ui/sheet"
import { QuickInsertableTextarea } from "@/components/ui/insertable-textarea"
import { isBuiltinPromptId } from "@/utils/constants/prompt"
import { getRandomUUID } from "@/utils/crypto-polyfill"
import { usePromptAtoms, usePromptInsertCells } from "./context"

const TEXT_TRIGGER_CLASS = "cursor-pointer text-muted-foreground hover:text-foreground hover:underline"

/**
 * Sheet that creates or edits one prompt. With no `originPrompt` it creates;
 * built-in prompts open read-only.
 */
export function ConfigurePrompt({ originPrompt }: { originPrompt?: TranslatePromptObj }) {
  const promptAtoms = usePromptAtoms()
  const insertCells = usePromptInsertCells()
  const [config, setConfig] = useAtom(promptAtoms.config)

  const inEdit = !!originPrompt
  const isBuiltin = !!originPrompt && isBuiltinPromptId(originPrompt.id)

  const createDraft = (): TranslatePromptObj => originPrompt ?? { id: getRandomUUID(), name: "", systemPrompt: "", prompt: "" }
  const [prompt, setPrompt] = useState<TranslatePromptObj>(createDraft)

  const sheetTitle = isBuiltin
    ? originPrompt.name
    : inEdit
      ? i18n.t("options.quality.prompts.editor.editTitle")
      : i18n.t("options.quality.prompts.editor.newTitle")

  const triggerLabel = isBuiltin
    ? i18n.t("options.quality.prompts.view")
    : inEdit
      ? i18n.t("options.quality.prompts.edit")
      : i18n.t("options.quality.prompts.new")

  const save = () => {
    setConfig({
      ...config,
      patterns: inEdit
        ? config.patterns.map(p => p.id === prompt.id ? prompt : p)
        : [...config.patterns, prompt],
    })
  }

  return (
    <Sheet onOpenChange={(open) => {
      if (open)
        setPrompt(createDraft())
    }}
    >
      <SheetTrigger
        render={(
          <button
            type="button"
            className={inEdit ? TEXT_TRIGGER_CLASS : "cursor-pointer text-link hover:underline"}
          />
        )}
      >
        {triggerLabel}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[500px] sm:max-w-none">
        <SheetHeader>
          <SheetTitle>{sheetTitle}</SheetTitle>
        </SheetHeader>
        <FieldGroup className="flex-1 overflow-y-auto px-4">
          <Field>
            <FieldLabel htmlFor="prompt-name">{i18n.t("options.quality.prompts.editor.name")}</FieldLabel>
            <Input
              id="prompt-name"
              value={prompt.name}
              disabled={isBuiltin}
              onChange={event => setPrompt({ ...prompt, name: event.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="system-prompt">{i18n.t("options.quality.prompts.editor.systemPrompt")}</FieldLabel>
            <QuickInsertableTextarea
              value={prompt.systemPrompt}
              className="min-h-40 max-h-80"
              disabled={isBuiltin}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt({ ...prompt, systemPrompt: event.target.value })}
              insertCells={insertCells}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="prompt">{i18n.t("options.quality.prompts.editor.prompt")}</FieldLabel>
            <QuickInsertableTextarea
              value={prompt.prompt}
              className="max-h-60"
              disabled={isBuiltin}
              onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt({ ...prompt, prompt: event.target.value })}
              insertCells={insertCells}
            />
          </Field>
        </FieldGroup>
        {!isBuiltin && (
          <SheetFooter>
            <SheetClose render={<Button onClick={save} disabled={!prompt.name.trim()} />}>
              {i18n.t("options.quality.prompts.editor.save")}
            </SheetClose>
            <SheetClose render={<Button variant="outline" />}>
              {i18n.t("options.quality.prompts.editor.cancel")}
            </SheetClose>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}
