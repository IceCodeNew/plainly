import type { AddressInfo } from "node:net"
import type { Config } from "@/types/config/config"
import type { LLMProviderConfig } from "@/types/config/provider"
import { createServer } from "node:http"
import { afterAll, beforeAll, expect, it } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { storage } from "#imports"
import { CONFIG_STORAGE_KEY, DEFAULT_CONFIG } from "@/utils/constants/config"
import { aiTranslate } from "../ai"

const requestedModels: string[] = []

// A local server with the OpenAI Chat Completions wire contract.
const server = createServer(async (request, response) => {
  let body = ""
  for await (const chunk of request)
    body += chunk
  const { model } = JSON.parse(body) as { model: string }
  requestedModels.push(model)
  response.setHeader("Content-Type", "application/json")
  response.end(JSON.stringify({
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 1,
    model,
    choices: [{ index: 0, message: { role: "assistant", content: "Hola" }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  }))
})

let baseURL = ""

beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve))
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  fakeBrowser.reset()
})

afterAll(async () => {
  await new Promise(resolve => server.close(resolve))
})

it("user tests settings before they are saved: Given the stored custom provider has an old base URL and model, When a translation runs with the edited settings, Then the request goes to the edited base URL with the edited model", async () => {
  const saved = DEFAULT_CONFIG.providersConfig.find(config => config.provider === "openai-compatible") as LLMProviderConfig
  const stored: Config = {
    ...DEFAULT_CONFIG,
    providersConfig: DEFAULT_CONFIG.providersConfig.map(config => config.id === saved.id ? { ...saved, apiKey: "key", baseURL: "http://127.0.0.1:9/v1", model: "old-model" } : config),
  }
  await storage.setItem(`local:${CONFIG_STORAGE_KEY}`, stored)
  const edited = { ...saved, apiKey: "key", baseURL, model: "new-model" }

  const translation = await aiTranslate("Hello", "spa", edited, async () => ({ systemPrompt: "", prompt: "Hello" }))

  expect(translation).toBe("Hola")
  expect(requestedModels).toEqual(["new-model"])
})
