import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const sendMessageMock = vi.fn()

vi.mock("@/utils/message", () => ({
  sendMessage: sendMessageMock,
}))

describe("translation progress tracker", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    sendMessageMock.mockReset()
    sendMessageMock.mockResolvedValue(undefined)
    vi.resetModules()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("counts started and finished translations and reports them once per tick", async () => {
    const tracker = await import("../translation-progress")

    tracker.trackTranslationStarted()
    tracker.trackTranslationStarted()
    tracker.trackTranslationFinished(true)
    tracker.trackTranslationFinished(false)

    expect(tracker.getTranslationProgress()).toEqual({ total: 2, done: 2, failed: 1 })
    expect(sendMessageMock).not.toHaveBeenCalled()

    vi.runAllTimers()

    expect(sendMessageMock).toHaveBeenCalledTimes(1)
    expect(sendMessageMock).toHaveBeenCalledWith("reportTranslationProgress", { total: 2, done: 2, failed: 1 })
  })

  it("resets to zero and reports immediately when a page session starts or stops", async () => {
    const tracker = await import("../translation-progress")

    tracker.trackTranslationStarted()
    tracker.resetTranslationProgress()

    expect(tracker.getTranslationProgress()).toEqual({ total: 0, done: 0, failed: 0 })
    expect(sendMessageMock).toHaveBeenCalledWith("reportTranslationProgress", { total: 0, done: 0, failed: 0 })

    vi.runAllTimers()
    expect(sendMessageMock).toHaveBeenCalledTimes(1)
  })

  it("swallows report failures so translation never depends on the background", async () => {
    sendMessageMock.mockRejectedValue(new Error("Receiving end does not exist"))
    const tracker = await import("../translation-progress")

    tracker.trackTranslationStarted()
    vi.runAllTimers()
    await Promise.resolve()

    expect(tracker.getTranslationProgress().total).toBe(1)
  })
})
