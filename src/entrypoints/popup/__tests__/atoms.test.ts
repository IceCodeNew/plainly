import { describe, expect, it } from "vitest"
import { isTranslatableUrl } from "../atoms"

describe("isTranslatableUrl", () => {
  it("accepts web pages and local files", () => {
    expect(isTranslatableUrl("https://example.com/article")).toBe(true)
    expect(isTranslatableUrl("http://localhost:3000/")).toBe(true)
    expect(isTranslatableUrl("file:///Users/me/paper.html")).toBe(true)
  })

  it("rejects browser and extension surfaces where content scripts cannot run", () => {
    expect(isTranslatableUrl("chrome://newtab/")).toBe(false)
    expect(isTranslatableUrl("chrome-extension://abc/options.html")).toBe(false)
    expect(isTranslatableUrl("about:blank")).toBe(false)
    expect(isTranslatableUrl("edge://extensions/")).toBe(false)
    expect(isTranslatableUrl(undefined)).toBe(false)
    expect(isTranslatableUrl("")).toBe(false)
  })
})
