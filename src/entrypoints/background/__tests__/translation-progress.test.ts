import { beforeEach, describe, expect, it, vi } from "vitest"
import { browser } from "#imports"

const sendMessageMock = vi.fn()
const onMessageMock = vi.fn()
const messageHandlers = new Map<string, (msg: any) => any>()

vi.mock("@/utils/message", () => ({
  onMessage: onMessageMock,
  sendMessage: sendMessageMock,
}))

function getHandler(name: string) {
  const handler = messageHandlers.get(name)
  if (!handler) {
    throw new Error(`Expected message handler to be registered: ${name}`)
  }
  return handler
}

describe("background translation progress", () => {
  beforeEach(async () => {
    vi.resetModules()
    messageHandlers.clear()
    sendMessageMock.mockReset()
    sendMessageMock.mockResolvedValue(undefined)
    onMessageMock.mockReset()
    onMessageMock.mockImplementation((name: string, handler: (msg: any) => any) => {
      messageHandlers.set(name, handler)
      return vi.fn()
    })
    browser.tabs.onRemoved.addListener = vi.fn()

    const { setupTranslationProgress } = await import("../translation-progress")
    setupTranslationProgress()
  })

  it("sums reports from every frame of a tab and broadcasts the total", () => {
    const report = getHandler("reportTranslationProgress")
    report({ sender: { tab: { id: 7 }, frameId: 0 }, data: { total: 10, done: 4, failed: 1 } })
    report({ sender: { tab: { id: 7 }, frameId: 3 }, data: { total: 2, done: 2, failed: 0 } })

    expect(sendMessageMock).toHaveBeenLastCalledWith("translationProgressChanged", {
      tabId: 7,
      progress: { total: 12, done: 6, failed: 1 },
    })
    expect(getHandler("getTranslationProgressByTabId")({ data: { tabId: 7 } })).toEqual({ total: 12, done: 6, failed: 1 })
  })

  it("replaces a frame's earlier report instead of accumulating it", () => {
    const report = getHandler("reportTranslationProgress")
    report({ sender: { tab: { id: 7 }, frameId: 0 }, data: { total: 10, done: 4, failed: 0 } })
    report({ sender: { tab: { id: 7 }, frameId: 0 }, data: { total: 10, done: 10, failed: 0 } })

    expect(getHandler("getTranslationProgressByTabId")({ data: { tabId: 7 } })).toEqual({ total: 10, done: 10, failed: 0 })
  })

  it("returns null for tabs that never reported and ignores senders without a tab", () => {
    getHandler("reportTranslationProgress")({ sender: {}, data: { total: 1, done: 0, failed: 0 } })

    expect(getHandler("getTranslationProgressByTabId")({ data: { tabId: 99 } })).toBeNull()
    expect(sendMessageMock).not.toHaveBeenCalled()
  })
})
