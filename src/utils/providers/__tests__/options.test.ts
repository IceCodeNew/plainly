import { describe, expect, it } from "vitest"
import { getProviderOptionsWithOverride } from "../options"

describe("provider options", () => {
  it.each([
    ["openai", { openai: { reasoningEffort: "none" } }],
    ["deepseek", { deepseek: { thinking: { type: "disabled" } } }],
    ["openai-compatible", { "openai-compatible": { reasoningEffort: "none" } }],
  ] as const)("user translates with any %s model: Given no saved provider options, When a request is sent, Then thinking is turned off", (provider, expected) => {
    expect(getProviderOptionsWithOverride(provider)).toEqual(expected)
  })

  it("user turns thinking back on: Given saved provider options, When a request is sent, Then only the saved options are sent", () => {
    expect(getProviderOptionsWithOverride("deepseek", { thinking: { type: "enabled" } })).toEqual({ deepseek: { thinking: { type: "enabled" } } })
  })

  it("user clears the provider options: Given an empty saved object, When a request is sent, Then no option is sent", () => {
    expect(getProviderOptionsWithOverride("openai", {})).toEqual({ openai: {} })
  })

  it("normalizes common OpenAI-compatible snake_case aliases", () => {
    const options = getProviderOptionsWithOverride("openai-compatible", {
      reasoning_effort: "minimal",
      verbosity: "low",
      foo: "bar",
    })

    expect(options).toEqual({
      "openai-compatible": {
        reasoningEffort: "minimal",
        textVerbosity: "low",
        foo: "bar",
      },
    })
  })

  it("prefers canonical OpenAI-compatible keys when both forms are present", () => {
    const options = getProviderOptionsWithOverride("openai-compatible", {
      reasoning_effort: "high",
      reasoningEffort: "minimal",
      verbosity: "high",
      textVerbosity: "low",
    })

    expect(options).toEqual({
      "openai-compatible": {
        reasoningEffort: "minimal",
        textVerbosity: "low",
      },
    })
  })
})
