import { useAtomValue, useSetAtom } from "jotai"
import { useEffect } from "react"
import { onMessage } from "@/utils/message"
import { activeTabAtom, pageTranslationEnabledAtom, translationProgressAtom } from "./atoms"

/**
 * Keeps the popup's view of the active tab in step with the background while
 * the popup stays open (shortcut toggles, translation progress).
 */
export function usePopupSync() {
  const activeTab = useAtomValue(activeTabAtom)
  const setEnabled = useSetAtom(pageTranslationEnabledAtom)
  const setProgress = useSetAtom(translationProgressAtom)

  useEffect(() => {
    const cleanupState = onMessage("pageTranslationStateChanged", (message) => {
      if (message.data.tabId !== activeTab.id)
        return
      setEnabled(message.data.enabled)
      if (!message.data.enabled)
        setProgress(null)
    })

    const cleanupProgress = onMessage("translationProgressChanged", (message) => {
      if (message.data.tabId !== activeTab.id)
        return
      setProgress(message.data.progress)
    })

    return () => {
      cleanupState()
      cleanupProgress()
    }
  }, [activeTab.id, setEnabled, setProgress])
}
