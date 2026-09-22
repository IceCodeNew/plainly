import type { PromptAtoms, PromptInsertCell } from "./context"
import { PromptConfiguratorContext } from "./context"
import { PromptList } from "./prompt-list"

export type { CustomPromptsConfig, PromptAtoms } from "./context"
export { usePromptAtoms } from "./context"

interface PromptConfiguratorProps {
  promptAtoms: PromptAtoms
  insertCells: PromptInsertCell[]
}

export function PromptConfigurator({ promptAtoms, insertCells }: PromptConfiguratorProps) {
  return (
    <PromptConfiguratorContext value={{ promptAtoms, insertCells }}>
      <PromptList />
    </PromptConfiguratorContext>
  )
}
