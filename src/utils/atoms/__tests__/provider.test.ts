import type { ProviderConfig } from "@/types/config/provider"
import { describe, expect, it } from "vitest"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { updateProviderConfig } from "../provider"

type OpenAIProviderConfig = Extract<ProviderConfig, { provider: "openai" }>

describe("provider config updates", () => {
  it("replaces the model ID without changing untouched fields", () => {
    const result = updateProviderConfig(DEFAULT_PROVIDER_CONFIG.openai, { model: "gpt-5-custom" })

    expect(result).toEqual({ ...DEFAULT_PROVIDER_CONFIG.openai, model: "gpt-5-custom" })
  })

  it("merges provider option objects and preserves the rest of the config", () => {
    const result = updateProviderConfig(DEFAULT_PROVIDER_CONFIG.openai, {
      providerOptions: {
        reasoningEffort: "minimal",
      },
    }) as OpenAIProviderConfig

    expect(result.providerOptions).toEqual({ reasoningEffort: "minimal" })
    expect(result.model).toEqual(DEFAULT_PROVIDER_CONFIG.openai.model)
    expect(result.provider).toBe("openai")
  })

  it("merges provider headers and preserves the rest of the config", () => {
    const result = updateProviderConfig(DEFAULT_PROVIDER_CONFIG.openai, {
      headers: {
        "X-Test": "1",
      },
    }) as OpenAIProviderConfig

    expect(result.headers).toEqual({ "X-Test": "1" })
    expect(result.model).toEqual(DEFAULT_PROVIDER_CONFIG.openai.model)
    expect(result.provider).toBe("openai")
  })
})
