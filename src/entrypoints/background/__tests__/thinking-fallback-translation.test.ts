import type { AddressInfo } from "node:net"
import type { Config } from "@/types/config/config"
import type { LLMProviderConfig } from "@/types/config/provider"
import type { WebPagePromptContext } from "@/types/content"
import { createServer } from "node:http"
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { storage } from "#imports"
import { CONFIG_STORAGE_KEY, DEFAULT_CONFIG } from "@/utils/constants/config"
import { getTranslatePrompt } from "@/utils/prompts/translate"
import { saveThinkingFallback } from "@/utils/providers/thinking-fallback"
import { executeBatchTranslation } from "../translation-queues"

const receivedOptions: Record<string, unknown>[] = []

// A gateway in front of DeepSeek V4.1 Flash, with the OpenAI Chat Completions
// wire contract: it rejects reasoning_effort "none" with the reported message.
const server = createServer(async (request, response) => {
  let body = ""
  for await (const chunk of request)
    body += chunk
  const { reasoning_effort, thinking } = JSON.parse(body) as { reasoning_effort?: string, thinking?: unknown }
  receivedOptions.push({ reasoning_effort, thinking })
  response.setHeader("Content-Type", "application/json")
  if (reasoning_effort === "none") {
    response.writeHead(400).end(JSON.stringify({ error: { message: "Invalid option: expected one of \"low\"|\"medium\"|\"high\"|\"xhigh\"|\"max\"" } }))
    return
  }
  response.end(JSON.stringify({
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 1,
    model: "deepseek-v4.1-flash",
    choices: [{ index: 0, message: { role: "assistant", content: "Hola" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  }))
})

let provider: LLMProviderConfig

async function storedOptions() {
  const config = await storage.getItem<Config>(`local:${CONFIG_STORAGE_KEY}`)
  return config?.providersConfig.find(item => item.id === provider.id)?.providerOptions
}

beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  const defaults = DEFAULT_CONFIG.providersConfig.find(config => config.provider === "openai-compatible") as LLMProviderConfig
  provider = { ...defaults, apiKey: "key", baseURL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, model: "deepseek-v4.1-flash", providerOptions: { reasoningEffort: "none", topK: 20 } }
})

beforeEach(async () => {
  fakeBrowser.reset()
  receivedOptions.length = 0
  await storage.setItem(`local:${CONFIG_STORAGE_KEY}`, {
    ...DEFAULT_CONFIG,
    providersConfig: DEFAULT_CONFIG.providersConfig.map(config => config.id === provider.id ? provider : config),
    translate: { ...DEFAULT_CONFIG.translate, providerId: provider.id },
  })
})

afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
})

it("user translates a page without a connection test: Given a new custom provider with the preset behind a strict gateway, When a batch is translated, Then it is translated with the thinking switch and the saved options use it", async () => {
  const data = { text: "Hello", langConfig: DEFAULT_CONFIG.language, providerConfig: provider, hash: "h", scheduleAt: 0 }

  const result = await executeBatchTranslation<WebPagePromptContext>([data], getTranslatePrompt)

  expect(result).toEqual(["Hola"])
  expect(receivedOptions).toEqual([{ reasoning_effort: "none" }, { thinking: { type: "disabled" } }])
  expect(await storedOptions()).toEqual({ topK: 20, thinking: { type: "disabled" } })
})

it("user changed the options while the page was translated: Given other saved options, When the fallback works, Then the saved options stay", async () => {
  await saveThinkingFallback(provider.id, provider.providerOptions, { options: { reasoningEffort: "low" }, reason: "" })

  const saved = await saveThinkingFallback(provider.id, provider.providerOptions, { options: { thinking: { type: "disabled" } }, reason: "" })

  expect(saved).toBe(false)
  expect(await storedOptions()).toEqual({ reasoningEffort: "low" })
})

it("user translates several paragraphs at once: Given parallel requests that all used the fallback, When they save, Then only one save reports it", async () => {
  const fallback = { options: { topK: 20, thinking: { type: "disabled" } }, reason: "" }

  const saved = await Promise.all([1, 2, 3].map(() => saveThinkingFallback(provider.id, provider.providerOptions, fallback)))

  expect(saved.filter(Boolean)).toHaveLength(1)
})
