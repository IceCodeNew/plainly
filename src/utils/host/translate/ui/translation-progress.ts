import type { TranslationProgress } from "@/types/translation-progress"
import { EMPTY_TRANSLATION_PROGRESS } from "@/types/translation-progress"
import { sendMessage } from "@/utils/message"

const REPORT_DELAY_MS = 150

let progress: TranslationProgress = EMPTY_TRANSLATION_PROGRESS
let reportTimer: ReturnType<typeof setTimeout> | null = null

function report() {
  // The background may be asleep or the extension reloading; progress is
  // advisory, so a failed report is dropped rather than surfaced.
  void sendMessage("reportTranslationProgress", progress).catch(() => {})
}

function scheduleReport() {
  if (reportTimer)
    return
  reportTimer = setTimeout(() => {
    reportTimer = null
    report()
  }, REPORT_DELAY_MS)
}

export function trackTranslationStarted() {
  progress = { ...progress, total: progress.total + 1 }
  scheduleReport()
}

export function trackTranslationFinished(succeeded: boolean) {
  progress = {
    total: progress.total,
    done: progress.done + 1,
    failed: progress.failed + (succeeded ? 0 : 1),
  }
  scheduleReport()
}

export function resetTranslationProgress() {
  progress = EMPTY_TRANSLATION_PROGRESS
  if (reportTimer) {
    clearTimeout(reportTimer)
    reportTimer = null
  }
  report()
}

export function getTranslationProgress(): TranslationProgress {
  return progress
}
