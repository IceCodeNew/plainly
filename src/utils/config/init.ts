import type { Config } from "@/types/config/config"
import type { ConfigMeta } from "@/types/config/meta"
import { dequal } from "dequal"
import { storage } from "#imports"
import { configSchema } from "@/types/config/config"
import { isAPIProviderConfig, isNonCustomLLMProviderConfig } from "@/types/config/provider"
import { CONFIG_SCHEMA_VERSION, CONFIG_STORAGE_KEY, DEFAULT_CONFIG } from "../constants/config"
import { DEFAULT_LLM_PROVIDER_MODELS, RETIRED_DEFAULT_MODELS } from "../constants/providers"
import { logger } from "../logger"

/**
 * Initialize the config, this function should only be called once in the background script
 * @returns The extension config
 */
export async function initializeConfig() {
  const [storedConfig, configMeta] = await Promise.all([
    storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`),
    storage.getMeta<ConfigMeta>(`local:${CONFIG_STORAGE_KEY}`),
  ])

  let config: Config
  let didConfigChange = false

  if (!storedConfig) {
    config = DEFAULT_CONFIG
    didConfigChange = true
  }
  else {
    config = storedConfig
  }

  const parseResult = configSchema.safeParse(config)
  if (!parseResult.success) {
    logger.warn("Config is invalid, using default config")
    config = DEFAULT_CONFIG
    didConfigChange = true
  }
  else if (!dequal(config, parseResult.data)) {
    config = parseResult.data
    didConfigChange = true
  }

  if ((configMeta?.schemaVersion ?? 1) < 2) {
    const modelResult = replaceRetiredDefaultModels(config)
    config = modelResult.config
    didConfigChange = didConfigChange || modelResult.changed
  }

  if (import.meta.env.DEV) {
    const apiKeyResult = applyAPIKeysFromEnv(config)
    config = apiKeyResult.config
    didConfigChange = didConfigChange || apiKeyResult.changed
  }

  const didMetaNeedUpdate
    = configMeta?.schemaVersion !== CONFIG_SCHEMA_VERSION
      || configMeta?.lastModifiedAt === undefined

  if (didConfigChange) {
    await storage.setItem<Config>(`local:${CONFIG_STORAGE_KEY}`, config)
  }

  if (didConfigChange || didMetaNeedUpdate) {
    await storage.setMeta<ConfigMeta>(`local:${CONFIG_STORAGE_KEY}`, {
      schemaVersion: CONFIG_SCHEMA_VERSION,
      lastModifiedAt: configMeta?.lastModifiedAt ?? Date.now(),
    })
  }
}

/**
 * Replaces the retired default models with the current defaults. It runs once,
 * so a user can select such a model again after the upgrade.
 */
function replaceRetiredDefaultModels(config: Config): { config: Config, changed: boolean } {
  let changed = false
  const providersConfig = config.providersConfig.map((providerConfig) => {
    if (!isNonCustomLLMProviderConfig(providerConfig) || !RETIRED_DEFAULT_MODELS[providerConfig.provider].includes(providerConfig.model))
      return providerConfig
    changed = true
    return { ...providerConfig, model: DEFAULT_LLM_PROVIDER_MODELS[providerConfig.provider] }
  })
  return { config: changed ? { ...config, providersConfig } : config, changed }
}

function applyAPIKeysFromEnv(config: Config): { config: Config, changed: boolean } {
  let changed = false

  const providersConfig = config.providersConfig.map((providerConfig) => {
    if (!isAPIProviderConfig(providerConfig)) {
      return providerConfig
    }

    const apiKeyEnvName = `WXT_${providerConfig.provider.toUpperCase()}_API_KEY`
    const envApiKey = import.meta.env[apiKeyEnvName] as string | undefined
    if (!envApiKey || providerConfig.apiKey === envApiKey) {
      return providerConfig
    }

    changed = true
    return {
      ...providerConfig,
      apiKey: envApiKey,
    }
  })

  if (!changed) {
    return { config, changed: false }
  }

  return {
    config: {
      ...config,
      providersConfig,
    },
    changed: true,
  }
}
