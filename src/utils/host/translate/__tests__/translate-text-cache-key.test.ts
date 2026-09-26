import type { Config } from "@/types/config/config"
import type { LLMProviderConfig } from "@/types/config/provider"
import type { WebPagePromptContext } from "@/types/content"
import { beforeEach, describe, expect, it } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { storage } from "#imports"
import { CONFIG_STORAGE_KEY, DEFAULT_CONFIG } from "@/utils/constants/config"
import { onMessage } from "@/utils/message"
import { translateTextCore } from "../translate-text"

const providerConfig: LLMProviderConfig = {
  id: "openai-default",
  name: "OpenAI",
  provider: "openai",
  enabled: true,
  apiKey: "sk-test",
  model: "gpt-5-mini",
}

const langConfig = { sourceCode: "eng", targetCode: "cmn", level: "intermediate" } as const

const basePageContext: WebPagePromptContext = {
  webTitle: "Release notes",
  webDescription: "Notes for the release",
  webContent: "Page body.",
  webSummary: "The release adds a new setting.",
}

async function saveTranslatePrompt(systemPrompt: string) {
  const config: Config = {
    ...DEFAULT_CONFIG,
    translate: {
      ...DEFAULT_CONFIG.translate,
      customPromptsConfig: {
        promptId: "custom",
        patterns: [{ id: "custom", name: "Custom", systemPrompt, prompt: "{{input}}" }],
      },
    },
  }
  await storage.setItem(`local:${CONFIG_STORAGE_KEY}`, config)
}

async function cacheKeyFor(pageChanges: Partial<WebPagePromptContext>): Promise<string> {
  let cacheKey = ""
  const removeListener = onMessage("enqueueTranslateRequest", async (message) => {
    cacheKey = message.data.hash
    return "translated"
  })
  try {
    await translateTextCore({
      text: "The release adds a new setting.",
      langConfig,
      providerConfig,
      webPageContext: { ...basePageContext, ...pageChanges },
    })
  }
  finally {
    removeListener()
  }
  return cacheKey
}

describe("translation cache key", () => {
  beforeEach(async () => {
    fakeBrowser.reset()
    await storage.setItem(`local:${CONFIG_STORAGE_KEY}`, DEFAULT_CONFIG)
  })

  it("user gets a cached translation when only page content that the prompt does not use is different", async () => {
    // Given the default prompt, which does not use {{webContent}}
    // When the user translates the same paragraph on two pages with different content
    const firstKey = await cacheKeyFor({ webContent: "First page body." })
    const secondKey = await cacheKeyFor({ webContent: "Second page body." })

    // Then the model receives the same request, so both translations use one cache entry
    expect(secondKey).toBe(firstKey)
  })

  it("user gets a new translation when the prompt uses page content that is different only at the end", async () => {
    // Given a custom prompt that sends {{webContent}} to the model
    await saveTranslatePrompt("Translate to {{targetLanguage}}. Page content: {{webContent}}")
    const sharedStart = "Shared page text. ".repeat(100)

    // When the user translates the same paragraph on two pages whose content is different only at the end
    const firstKey = await cacheKeyFor({ webContent: `${sharedStart} first ending` })
    const secondKey = await cacheKeyFor({ webContent: `${sharedStart} second ending` })

    // Then the model receives different requests, so the translations use different cache entries
    expect(secondKey).not.toBe(firstKey)
  })

  it.each([
    ["title", { webTitle: "Changelog" }],
    ["summary", { webSummary: "The release removes an old setting." }],
  ])("user gets a new translation when the page %s that the default prompt uses is different", async (_field, pageChanges) => {
    // Given the default prompt, which uses {{webTitle}} and {{webSummary}}
    // When the user translates the same paragraph on two pages with a different title or summary
    const firstKey = await cacheKeyFor({})
    const secondKey = await cacheKeyFor(pageChanges)

    // Then the model receives different requests, so the translations use different cache entries
    expect(secondKey).not.toBe(firstKey)
  })
})
