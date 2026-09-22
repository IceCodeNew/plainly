import { useAtomValue } from "jotai"
import { i18n } from "#imports"
import { configAtom } from "@/utils/atoms/config"
import { getRandomUUID } from "@/utils/crypto-polyfill"
import { translateNodesBilingualMode, translateNodeTranslationOnlyMode } from "@/utils/host/translate/node-manipulation"

export function RetryButton({ nodes }: { nodes: ChildNode[] }) {
  const config = useAtomValue(configAtom)
  const translationMode = config.translate.mode

  const handleRetry = async () => {
    const walkId = getRandomUUID()
    if (translationMode === "bilingual") {
      await translateNodesBilingualMode(nodes, walkId, config)
    }
    else if (translationMode === "translationOnly") {
      await translateNodeTranslationOnlyMode(nodes, walkId, config)
    }
  }

  return (
    <button
      type="button"
      onClick={handleRetry}
      className="shrink-0 rounded-md border border-border bg-background px-2 py-0.5 text-xs font-medium text-foreground hover:bg-muted"
    >
      {i18n.t("translation.retry")}
    </button>
  )
}
