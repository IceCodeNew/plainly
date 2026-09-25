import { describe, expect, it } from "vitest"
import { resolveModelId } from "../model-id"

describe("resolveModelId", () => {
  it("returns a trimmed model id", () => {
    expect(resolveModelId(" gpt-4.1-mini ")).toBe("gpt-4.1-mini")
  })

  it("returns undefined when the provider has no model yet", () => {
    expect(resolveModelId("")).toBeUndefined()
    expect(resolveModelId("  ")).toBeUndefined()
  })
})
