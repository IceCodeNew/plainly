import type { AllProviderTypes, APIProviderTypes, LLMProviderConfig, LLMProviderTypes, ProviderConfig, ProvidersConfig } from "@/types/config/provider"
import type { Theme } from "@/types/config/theme"
import customProviderLogo from "@/assets/providers/custom-provider.svg?url&no-inline"
import { API_PROVIDER_TYPES, CUSTOM_LLM_PROVIDER_TYPES, NON_CUSTOM_LLM_PROVIDER_TYPES, TRANSLATE_PROVIDER_TYPES } from "@/types/config/provider"
import { pick } from "@/types/utils"
import { getLobeIconsCDNUrlFn } from "../logo"

export const DEFAULT_LLM_PROVIDER_MODELS = {
  "openai-compatible": {
    model: "use-custom-model",
    isCustomModel: true,
    customModel: null,
  },
  "openai": {
    model: "gpt-5-mini",
    isCustomModel: false,
    customModel: null,
  },
  "deepseek": {
    model: "deepseek-v4-flash",
    isCustomModel: false,
    customModel: null,
  },
} as const satisfies Record<LLMProviderTypes, LLMProviderConfig["model"]>

export const PROVIDER_ITEMS: Record<AllProviderTypes, { logo: (theme: Theme) => string, name: string, website: string }>
  = {
    "openai-compatible": {
      logo: () => customProviderLogo,
      name: "Custom Provider",
      website: "",
    },
    "openai": {
      logo: getLobeIconsCDNUrlFn("openai"),
      name: "OpenAI",
      website: "https://platform.openai.com",
    },
    "deepseek": {
      logo: getLobeIconsCDNUrlFn("deepseek-color"),
      name: "DeepSeek",
      website: "https://platform.deepseek.com",
    },
  }

export const DEFAULT_PROVIDER_CONFIG = {
  "openai-compatible": {
    id: "openai-compatible-default",
    name: PROVIDER_ITEMS["openai-compatible"].name,
    enabled: true,
    provider: "openai-compatible",
    baseURL: "https://api.example.com/v1",
    model: DEFAULT_LLM_PROVIDER_MODELS["openai-compatible"],
  },
  "openai": {
    id: "openai-default",
    name: PROVIDER_ITEMS.openai.name,
    enabled: true,
    provider: "openai",
    model: DEFAULT_LLM_PROVIDER_MODELS.openai,
  },
  "deepseek": {
    id: "deepseek-default",
    name: PROVIDER_ITEMS.deepseek.name,
    enabled: true,
    provider: "deepseek",
    model: DEFAULT_LLM_PROVIDER_MODELS.deepseek,
  },
} as const satisfies Record<AllProviderTypes, ProviderConfig>

export const DEFAULT_PROVIDER_CONFIG_LIST: ProvidersConfig = [
  DEFAULT_PROVIDER_CONFIG.openai,
  DEFAULT_PROVIDER_CONFIG.deepseek,
  DEFAULT_PROVIDER_CONFIG["openai-compatible"],
]

export const TRANSLATE_PROVIDER_ITEMS = pick(
  PROVIDER_ITEMS,
  TRANSLATE_PROVIDER_TYPES,
)

export const LLM_PROVIDER_ITEMS = TRANSLATE_PROVIDER_ITEMS

export const API_PROVIDER_ITEMS = pick(
  PROVIDER_ITEMS,
  API_PROVIDER_TYPES,
)

export const PROVIDER_GROUPS = {
  builtInProviders: {
    types: NON_CUSTOM_LLM_PROVIDER_TYPES,
    tutorialSlug: "built-in-providers",
  },
  openaiCompatibleProviders: {
    types: CUSTOM_LLM_PROVIDER_TYPES,
    tutorialSlug: "openai-compatible-providers",
  },
} as const satisfies Record<string, { types: readonly APIProviderTypes[], tutorialSlug: string }>
