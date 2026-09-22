import type { TranslationProgress } from "@/types/translation-progress"
import { browser } from "#imports"
import { EMPTY_TRANSLATION_PROGRESS } from "@/types/translation-progress"
import { onMessage, sendMessage } from "@/utils/message"

/**
 * Latest progress report per frame, grouped by tab. Kept in memory only: it
 * is advisory UI state and is rebuilt as frames keep reporting.
 */
const progressByTab = new Map<number, Map<number, TranslationProgress>>()

function sumTabProgress(tabId: number): TranslationProgress | null {
  const frames = progressByTab.get(tabId)
  if (!frames || frames.size === 0)
    return null

  const total = { ...EMPTY_TRANSLATION_PROGRESS }
  for (const progress of frames.values()) {
    total.total += progress.total
    total.done += progress.done
    total.failed += progress.failed
  }
  return total
}

export function clearTranslationProgress(tabId: number) {
  progressByTab.delete(tabId)
}

export function setupTranslationProgress() {
  onMessage("reportTranslationProgress", (message) => {
    const tabId = message.sender?.tab?.id
    const frameId = message.sender?.frameId ?? 0
    if (typeof tabId !== "number")
      return

    let frames = progressByTab.get(tabId)
    if (!frames) {
      frames = new Map()
      progressByTab.set(tabId, frames)
    }
    frames.set(frameId, message.data)

    const progress = sumTabProgress(tabId)
    if (progress) {
      // The popup is often closed, so having no receiver is expected.
      void sendMessage("translationProgressChanged", { tabId, progress }).catch(() => {})
    }
  })

  onMessage("getTranslationProgressByTabId", (message) => {
    return sumTabProgress(message.data.tabId)
  })

  browser.tabs.onRemoved.addListener((tabId) => {
    clearTranslationProgress(tabId)
  })
}
