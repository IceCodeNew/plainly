import type { TranslatePromptObj } from "@/types/config/translate"
import { useAtom } from "jotai"
import { useState } from "react"
import { i18n } from "#imports"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/base-ui/alert-dialog"
import { usePromptAtoms } from "./context"

export function DeletePrompt({ originPrompt }: { originPrompt: TranslatePromptObj }) {
  const promptAtoms = usePromptAtoms()
  const [config, setConfig] = useAtom(promptAtoms.config)
  const [open, setOpen] = useState(false)

  const deletePrompt = () => {
    setConfig({
      ...config,
      patterns: config.patterns.filter(p => p.id !== originPrompt.id),
      promptId: config.promptId !== originPrompt.id ? config.promptId : null,
    })
    setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<button type="button" className="cursor-pointer text-muted-foreground hover:text-destructive hover:underline" />}>
        {i18n.t("options.quality.prompts.delete")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{i18n.t("options.quality.prompts.deleteDialog.title", [originPrompt.name])}</AlertDialogTitle>
          <AlertDialogDescription>{i18n.t("options.quality.prompts.deleteDialog.description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{i18n.t("options.quality.prompts.deleteDialog.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={deletePrompt}>{i18n.t("options.quality.prompts.deleteDialog.confirm")}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
