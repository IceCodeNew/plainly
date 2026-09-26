import type { PromptResolver } from "./api/ai"
import type { Config } from "@/types/config/config"
import type { ProviderConfig } from "@/types/config/provider"
import { isLLMProviderConfig } from "@/types/config/provider"
import { aiTranslate } from "./api/ai"
import { prepareTranslationText } from "./text-preparation"

export async function executeTranslate<TContext>(
  text: string,
  langConfig: Config["language"],
  providerConfig: ProviderConfig,
  promptResolver: PromptResolver<TContext>,
  options?: {
    forceBackgroundFetch?: boolean
    isBatch?: boolean
    context?: TContext
  },
) {
  const preparedText = prepareTranslationText(text)
  if (preparedText === "") {
    return ""
  }

  const { provider } = providerConfig
  let translatedText = ""

  if (isLLMProviderConfig(providerConfig)) {
    translatedText = await aiTranslate(preparedText, langConfig.targetCode, providerConfig, promptResolver, options)
  }
  else {
    throw new Error(`Unknown provider: ${provider}`)
  }

  return translatedText.trim()
}
