import { beforeEach, describe, expect, it, vi } from "vitest"
import { storage } from "#imports"

let getStorageItemMock: ReturnType<typeof vi.fn>

const {
  openAILanguageModelMock,
  deepSeekLanguageModelMock,
  openAICompatibleLanguageModelMock,
  createOpenAIMock,
  createDeepSeekMock,
  createOpenAICompatibleMock,
} = vi.hoisted(() => {
  const openAILanguageModelMock = vi.fn()
  const deepSeekLanguageModelMock = vi.fn()
  const openAICompatibleLanguageModelMock = vi.fn()
  const createOpenAIMock = vi.fn((_options?: Record<string, unknown>) => ({
    languageModel: openAILanguageModelMock,
  }))
  const createDeepSeekMock = vi.fn((_options?: Record<string, unknown>) => ({
    languageModel: deepSeekLanguageModelMock,
  }))
  const createOpenAICompatibleMock = vi.fn((_options?: Record<string, unknown>) => ({
    languageModel: openAICompatibleLanguageModelMock,
  }))

  return {
    openAILanguageModelMock,
    deepSeekLanguageModelMock,
    openAICompatibleLanguageModelMock,
    createOpenAIMock,
    createDeepSeekMock,
    createOpenAICompatibleMock,
  }
})

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: createOpenAIMock,
}))

vi.mock("@ai-sdk/deepseek", () => ({
  createDeepSeek: createDeepSeekMock,
}))

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: createOpenAICompatibleMock,
}))

describe("getModelById", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    openAILanguageModelMock.mockReturnValue("openai-model")
    deepSeekLanguageModelMock.mockReturnValue("deepseek-model")
    openAICompatibleLanguageModelMock.mockReturnValue("custom-model")
    getStorageItemMock = vi.fn()
    ;(storage.getItem as unknown as ReturnType<typeof vi.fn>) = getStorageItemMock
  })

  it("creates OpenAI language models", async () => {
    getStorageItemMock.mockResolvedValue({
      providersConfig: [{
        id: "openai-default",
        name: "OpenAI",
        enabled: true,
        provider: "openai",
        apiKey: "test-key",
        model: {
          model: "gpt-5-mini",
          isCustomModel: false,
          customModel: null,
        },
      }],
    })

    const { getModelById } = await import("../model")
    const result = await getModelById("openai-default")

    expect(result).toBe("openai-model")
    expect(createOpenAIMock).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: "test-key",
    }))
    expect(openAILanguageModelMock).toHaveBeenCalledWith("gpt-5-mini")
  })

  it("creates DeepSeek language models", async () => {
    getStorageItemMock.mockResolvedValue({
      providersConfig: [{
        id: "deepseek-default",
        name: "DeepSeek",
        enabled: true,
        provider: "deepseek",
        apiKey: "test-key",
        model: {
          model: "deepseek-v4-flash",
          isCustomModel: false,
          customModel: null,
        },
      }],
    })

    const { getModelById } = await import("../model")
    const result = await getModelById("deepseek-default")

    expect(result).toBe("deepseek-model")
    expect(createDeepSeekMock).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: "test-key",
    }))
    expect(deepSeekLanguageModelMock).toHaveBeenCalledWith("deepseek-v4-flash")
  })

  it("passes custom headers for OpenAI-compatible providers", async () => {
    getStorageItemMock.mockResolvedValue({
      providersConfig: [
        {
          id: "custom-openai",
          name: "Custom Provider",
          enabled: true,
          provider: "openai-compatible",
          apiKey: "custom-key",
          baseURL: "http://127.0.0.1:1234/v1",
          model: {
            model: "use-custom-model",
            isCustomModel: true,
            customModel: "custom-model",
          },
          headers: {
            "HTTP-Referer": "https://example.com",
            "X-Title": "Plainly",
          },
        },
      ],
    })

    const { getModelById } = await import("../model")
    const result = await getModelById("custom-openai")

    expect(result).toBe("custom-model")
    expect(createOpenAICompatibleMock).toHaveBeenCalledWith(expect.objectContaining({
      name: "openai-compatible",
      baseURL: "http://127.0.0.1:1234/v1",
      apiKey: "custom-key",
      headers: {
        "HTTP-Referer": "https://example.com",
        "X-Title": "Plainly",
      },
    }))
    expect(openAICompatibleLanguageModelMock).toHaveBeenCalledWith("custom-model")
  })
})
