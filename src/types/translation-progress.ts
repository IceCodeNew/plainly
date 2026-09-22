export interface TranslationProgress {
  /** Paragraph translations started in this page session. */
  total: number
  /** Translations that finished, successfully or not. */
  done: number
  /** Translations that finished with an error. */
  failed: number
}

export const EMPTY_TRANSLATION_PROGRESS: TranslationProgress = { total: 0, done: 0, failed: 0 }
