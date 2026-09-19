import { describe, expect, it } from "vitest"
import { mergeWithArrayOverwrite } from "../config"

describe("mergeWithArrayOverwrite", () => {
  it("user updates preferences: Given nested settings, When a patch replaces prompts, Then arrays are replaced and untouched settings are preserved", () => {
    // Given
    const config = {
      language: { sourceCode: "auto", targetCode: "eng" },
      translate: {
        mode: "bilingual",
        page: { preload: { margin: 500, threshold: 0.5 }, range: "main" },
        customPromptsConfig: {
          promptId: null,
          patterns: [{ id: "old", name: "Old", systemPrompt: "", prompt: "old" }],
        },
      },
    }

    const patch = {
      language: { targetCode: "jpn" },
      translate: {
        customPromptsConfig: {
          promptId: null,
          patterns: [{ id: "new", name: "New", systemPrompt: "", prompt: "new" }],
        },
        page: {
          preload: {
            margin: 1000,
            threshold: 0.25,
          },
        },
        mode: "replace",
      },
    }

    // When
    const result = mergeWithArrayOverwrite(config, patch)

    // Then
    expect(result.translate.customPromptsConfig.patterns).toEqual([{ id: "new", name: "New", systemPrompt: "", prompt: "new" }])
    expect(result.language).toEqual({ sourceCode: "auto", targetCode: "jpn" })
    expect(result.translate.page).toEqual({ preload: { margin: 1000, threshold: 0.25 }, range: "main" })
    expect(result.translate.mode).toBe("replace")

    // Ensure immutability
    expect(result).not.toBe(config)
    expect(result.translate.customPromptsConfig.patterns).not.toBe(config.translate.customPromptsConfig.patterns)
    expect(config.translate.customPromptsConfig.patterns).toEqual([{ id: "old", name: "Old", systemPrompt: "", prompt: "old" }])
    expect(config.translate.page.preload).toEqual({ margin: 500, threshold: 0.5 })
  })

  it("should handle edge cases and type conversions", () => {
    // Array to non-array conversion
    expect(mergeWithArrayOverwrite({ arr: [1, 2] }, { arr: "string" })).toEqual({ arr: "string" })

    // Non-array to array conversion
    expect(mergeWithArrayOverwrite({ val: "text" }, { val: ["a", "b"] })).toEqual({ val: ["a", "b"] })

    // Empty array overwrite
    expect(mergeWithArrayOverwrite({ items: ["x"] }, { items: [] })).toEqual({ items: [] })

    // Null/undefined handling
    expect(mergeWithArrayOverwrite({ a: null }, { a: 1, b: undefined })).toEqual({ a: 1, b: undefined })
  })
})
