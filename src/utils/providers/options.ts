import type { DeepSeekLanguageModelOptions } from "@ai-sdk/deepseek"
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai"
import type { JSONValue } from "ai"
import type { LLMProviderTypes } from "@/types/config/provider"
import { CUSTOM_LLM_PROVIDER_TYPES } from "@/types/config/provider"

const OPENAI_COMPATIBLE_PROVIDER_TYPES = new Set<string>(CUSTOM_LLM_PROVIDER_TYPES)

const OPENAI_COMPATIBLE_OPTION_ALIASES = {
  reasoning_effort: "reasoningEffort",
  verbosity: "textVerbosity",
} as const satisfies Record<string, string>

function normalizeUserProviderOptions(
  provider: string,
  userOptions: Record<string, JSONValue>,
): Record<string, JSONValue> {
  if (!OPENAI_COMPATIBLE_PROVIDER_TYPES.has(provider)) {
    return userOptions
  }

  let changed = false
  const normalizedOptions: Record<string, JSONValue> = { ...userOptions }

  for (const [rawKey, canonicalKey] of Object.entries(OPENAI_COMPATIBLE_OPTION_ALIASES)) {
    if (!(rawKey in normalizedOptions)) {
      continue
    }

    if (!(canonicalKey in normalizedOptions)) {
      normalizedOptions[canonicalKey] = normalizedOptions[rawKey]
    }

    delete normalizedOptions[rawKey]
    changed = true
  }

  return changed ? normalizedOptions : userOptions
}

/**
 * Provider options that turn off thinking. Translation needs fast answers,
 * so every model of a provider gets them. Saved provider options replace them.
 */
const RECOMMENDED_PROVIDER_OPTIONS: Record<LLMProviderTypes, Record<string, JSONValue>> = {
  "openai": { reasoningEffort: "none" } satisfies OpenAIResponsesProviderOptions,
  "deepseek": { thinking: { type: "disabled" } } satisfies DeepSeekLanguageModelOptions as Record<string, JSONValue>,
  "openai-compatible": { reasoningEffort: "none" },
}

/**
 * Get the recommended provider options payload without wrapping it by provider id.
 */
export function getRecommendedProviderOptions(provider: LLMProviderTypes): Record<string, JSONValue> {
  return RECOMMENDED_PROVIDER_OPTIONS[provider]
}

/**
 * Get provider options for AI SDK calls.
 * - If the user has saved provider options (including `{}`), use them as-is.
 * - Otherwise use the recommended options of the provider.
 */
export function getProviderOptionsWithOverride(
  provider: LLMProviderTypes,
  userOptions?: Record<string, JSONValue>,
): Record<string, Record<string, JSONValue>> {
  return {
    [provider]: userOptions === undefined
      ? getRecommendedProviderOptions(provider)
      : normalizeUserProviderOptions(provider, userOptions),
  }
}
