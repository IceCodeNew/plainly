import type { APICallError } from "ai"
import { i18n } from "#imports"
import { RetryButton } from "./retry-button"

function describeError(error: APICallError): string {
  const status = error.statusCode ? `${error.statusCode} ` : ""
  const message = error.message?.trim() || i18n.t("translation.unknownError")
  return `${status}${message}`
}

/**
 * Inline replacement for a paragraph whose translation failed: one muted
 * line with the reason and a retry button, nothing floating.
 */
export function TranslationError({ nodes, error }: { nodes: ChildNode[], error: APICallError }) {
  const detail = describeError(error)

  return (
    <div className="notranslate inline-flex max-w-full items-center gap-2 text-sm text-muted-foreground">
      <span className="truncate" title={detail}>
        {i18n.t("translation.failed")}
        {" · "}
        {detail}
      </span>
      <RetryButton nodes={nodes} />
    </div>
  )
}
