import type { TranslationProgress } from "@/types/translation-progress"
import { atom } from "jotai"

export interface ActiveTabInfo {
  id: number | null
  url: string
  /** Whether the content script can run on this tab (regular web pages and local files). */
  translatable: boolean
}

const TRANSLATABLE_URL_PATTERN = /^(?:https?|file):/i

export function isTranslatableUrl(url: string | undefined): boolean {
  return !!url && TRANSLATABLE_URL_PATTERN.test(url)
}

export const activeTabAtom = atom<ActiveTabInfo>({ id: null, url: "", translatable: false })

export const pageTranslationEnabledAtom = atom(false)

export const translationProgressAtom = atom<TranslationProgress | null>(null)
