import type { Config } from "@/types/config/config"
import { beforeEach, expect, it } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { storage } from "#imports"
import { CONFIG_STORAGE_KEY, DEFAULT_CONFIG } from "@/utils/constants/config"
import { initializeConfig } from "../init"

beforeEach(() => {
  fakeBrowser.reset()
})

it("user upgrades from a version without prompt languages: Given a saved config with no prompt language, When the extension starts, Then the prompt language is auto and the other settings stay", async () => {
  // Given
  const { promptLanguage: _promptLanguage, ...translate } = DEFAULT_CONFIG.translate
  const saved = {
    ...DEFAULT_CONFIG,
    providersConfig: DEFAULT_CONFIG.providersConfig.map(provider => ({ ...provider, apiKey: `key-${provider.id}` })),
    translate: { ...translate, enableAIContentAware: true },
  }
  await storage.setItem(`local:${CONFIG_STORAGE_KEY}`, saved)

  // When
  await initializeConfig()

  // Then
  const stored = await storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`)
  expect(stored?.translate.promptLanguage).toBe("auto")
  expect(stored?.translate.enableAIContentAware).toBe(true)
  expect(stored?.providersConfig.map(provider => provider.apiKey)).toEqual(saved.providersConfig.map(provider => provider.apiKey))
})

it("user selected a domain prompt: Given the legal prompt is saved as the selected prompt, When the extension starts, Then the selection stays", async () => {
  // Given
  const saved: Config = {
    ...DEFAULT_CONFIG,
    translate: { ...DEFAULT_CONFIG.translate, customPromptsConfig: { promptId: "builtin:legal", patterns: [] } },
  }
  await storage.setItem(`local:${CONFIG_STORAGE_KEY}`, saved)

  // When
  await initializeConfig()

  // Then
  const stored = await storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`)
  expect(stored?.translate.customPromptsConfig.promptId).toBe("builtin:legal")
})

it("user has an unknown prompt selected: Given a saved prompt id that is neither built in nor in the list, When the extension starts, Then the config is reset to the defaults", async () => {
  // Given
  const saved: Config = {
    ...DEFAULT_CONFIG,
    translate: { ...DEFAULT_CONFIG.translate, customPromptsConfig: { promptId: "builtin:unknown", patterns: [] } },
  }
  await storage.setItem(`local:${CONFIG_STORAGE_KEY}`, saved)

  // When
  await initializeConfig()

  // Then
  const stored = await storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`)
  expect(stored?.translate.customPromptsConfig.promptId).toBeNull()
})
