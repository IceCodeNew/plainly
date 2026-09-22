import { beforeEach, describe, expect, it, vi } from "vitest"
import { browser, storage } from "#imports"

const HOST_CONTENT_SCRIPT_FILE = "/content-scripts/host.js"

const tabsOnRemovedAddListenerMock = vi.fn()
const webNavigationOnBeforeNavigateAddListenerMock = vi.fn()
const webNavigationOnCompletedAddListenerMock = vi.fn()
const getAllFramesMock = vi.fn()
const executeScriptMock = vi.fn()
const storageGetItemMock = vi.fn()

const loggerErrorMock = vi.fn()
const loggerWarnMock = vi.fn()

vi.mock("@/utils/logger", () => ({
  logger: {
    error: loggerErrorMock,
    warn: loggerWarnMock,
  },
}))

interface NavigationDetails {
  tabId: number
  frameId: number
  documentId?: string
  parentFrameId?: number
  url?: string
}

interface FrameInfo {
  frameId: number
  parentFrameId: number
  url?: string
}

let currentTabId = 0

function createFrame(frameId: number, url: string, parentFrameId = 0): FrameInfo {
  return { frameId, parentFrameId, url }
}

function createDetails(overrides: Partial<NavigationDetails> = {}): NavigationDetails {
  return {
    tabId: currentTabId,
    frameId: 2,
    documentId: "doc-1",
    parentFrameId: 0,
    url: "https://example.com/frame",
    ...overrides,
  }
}

async function setupSubject() {
  const { setupIframeInjection } = await import("../iframe-injection")
  setupIframeInjection()

  const onRemoved = tabsOnRemovedAddListenerMock.mock.calls.at(-1)?.[0] as ((tabId: number) => void) | undefined
  const onBeforeNavigate = webNavigationOnBeforeNavigateAddListenerMock.mock.calls.at(-1)?.[0] as
    | ((details: NavigationDetails) => void)
    | undefined
  const onCompleted = webNavigationOnCompletedAddListenerMock.mock.calls.at(-1)?.[0] as
    | ((details: NavigationDetails) => Promise<void>)
    | undefined

  if (!onRemoved || !onBeforeNavigate || !onCompleted) {
    throw new Error("Expected iframe injection listeners to be registered")
  }

  return {
    onRemoved,
    onBeforeNavigate,
    onCompleted,
  }
}

describe("setupIframeInjection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    currentTabId += 1

    browser.tabs.onRemoved.addListener = tabsOnRemovedAddListenerMock
    browser.webNavigation.onBeforeNavigate.addListener = webNavigationOnBeforeNavigateAddListenerMock
    browser.webNavigation.onCompleted.addListener = webNavigationOnCompletedAddListenerMock
    browser.webNavigation.getAllFrames = getAllFramesMock
    browser.scripting.executeScript = executeScriptMock
    storage.getItem = storageGetItemMock

    getAllFramesMock.mockResolvedValue([
      createFrame(0, "https://example.com/app", -1),
      createFrame(2, "https://example.com/frame"),
    ])
    storageGetItemMock.mockResolvedValue({ enabled: true })
    executeScriptMock.mockResolvedValue(undefined)
  })

  it("skips iframe injection when page translation and node translation are not enabled", async () => {
    const { onCompleted } = await setupSubject()
    storageGetItemMock.mockResolvedValue({ enabled: false })

    await onCompleted(createDetails())

    expect(getAllFramesMock).not.toHaveBeenCalled()
    expect(executeScriptMock).not.toHaveBeenCalled()
  })

  it("skips eager iframe injection when only node translation is enabled", async () => {
    const { onCompleted } = await setupSubject()
    storageGetItemMock.mockResolvedValue({ enabled: false })

    await onCompleted(createDetails())

    expect(getAllFramesMock).not.toHaveBeenCalled()
    expect(executeScriptMock).not.toHaveBeenCalled()
  })

  it("injects host content when page translation is enabled", async () => {
    const { onCompleted } = await setupSubject()
    storageGetItemMock.mockResolvedValue({ enabled: true })

    await onCompleted(createDetails())

    expect(executeScriptMock).toHaveBeenCalledTimes(1)
    expect(executeScriptMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: { tabId: currentTabId, documentIds: ["doc-1"] },
      files: [HOST_CONTENT_SCRIPT_FILE],
    }))
  })

  it("auto-injects host content for allowlisted iframes when page translation is disabled", async () => {
    const { onCompleted } = await setupSubject()
    storageGetItemMock.mockResolvedValue({ enabled: false })

    await onCompleted(createDetails({
      url: "https://browse.library.kiwix.org/content/wikipedia_en_all_maxi_2026-02/A/Computer_science",
    }))

    expect(executeScriptMock).toHaveBeenCalledTimes(1)
    expect(executeScriptMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: { tabId: currentTabId, documentIds: ["doc-1"] },
      files: [HOST_CONTENT_SCRIPT_FILE],
    }))
  })

  it("auto-injects existing and late iframes for allowlisted top pages", async () => {
    const { onCompleted } = await setupSubject()
    storageGetItemMock.mockResolvedValue({ enabled: false })
    getAllFramesMock.mockResolvedValue([
      createFrame(0, "https://browse.library.kiwix.org/viewer", -1),
      createFrame(2, "https://reader.example/frame"),
    ])

    await onCompleted(createDetails({
      frameId: 0,
      documentId: "top-doc",
      parentFrameId: -1,
      url: "https://browse.library.kiwix.org/viewer",
    }))

    expect(executeScriptMock).toHaveBeenCalledTimes(1)
    expect(executeScriptMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: { tabId: currentTabId, frameIds: [2] },
      files: [HOST_CONTENT_SCRIPT_FILE],
    }))
    executeScriptMock.mockClear()
    getAllFramesMock.mockResolvedValue([
      createFrame(0, "https://browse.library.kiwix.org/viewer", -1),
      createFrame(4, "https://reader.example/late-frame"),
    ])

    await onCompleted(createDetails({
      frameId: 4,
      documentId: "doc-late",
      url: "https://reader.example/late-frame",
    }))

    expect(executeScriptMock).toHaveBeenCalledTimes(1)
    expect(executeScriptMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: { tabId: currentTabId, documentIds: ["doc-late"] },
      files: [HOST_CONTENT_SCRIPT_FILE],
    }))
  })

  it("dedupes host iframe injection", async () => {
    const { injectHostContentIntoTabIframes } = await import("../iframe-injection")
    storageGetItemMock.mockResolvedValue({ enabled: false })
    getAllFramesMock.mockResolvedValue([
      createFrame(0, "https://browse.library.kiwix.org/viewer", -1),
      createFrame(2, "https://browse.library.kiwix.org/content/article"),
    ])

    await injectHostContentIntoTabIframes(currentTabId, { requirePageTranslationEnabled: false })

    expect(executeScriptMock).toHaveBeenCalledTimes(1)
    expect(executeScriptMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: { tabId: currentTabId, frameIds: [2] },
      files: [HOST_CONTENT_SCRIPT_FILE],
    }))

    executeScriptMock.mockClear()

    await injectHostContentIntoTabIframes(currentTabId, { requirePageTranslationEnabled: false })

    expect(executeScriptMock).not.toHaveBeenCalled()
  })

  it("injects each document once and targets documentIds when available", async () => {
    const { onCompleted } = await setupSubject()
    const details = createDetails()

    await onCompleted(details)
    await onCompleted(details)

    expect(executeScriptMock).toHaveBeenCalledTimes(1)
    expect(executeScriptMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      target: { tabId: currentTabId, documentIds: ["doc-1"] },
      files: [HOST_CONTENT_SCRIPT_FILE],
    }))

    for (const [call] of executeScriptMock.mock.calls) {
      expect(call.target).toEqual({ tabId: currentTabId, documentIds: ["doc-1"] })
    }
  })

  it("falls back to frameIds targeting when documentId is unavailable", async () => {
    const { onCompleted } = await setupSubject()

    await onCompleted(createDetails({ documentId: undefined }))

    expect(executeScriptMock).toHaveBeenCalledTimes(1)
    for (const [call] of executeScriptMock.mock.calls) {
      expect(call.target).toEqual({ tabId: currentTabId, frameIds: [2] })
    }
  })

  it("clears per-frame injected state when a subframe starts navigating", async () => {
    const { onBeforeNavigate, onCompleted } = await setupSubject()
    const details = createDetails()

    await onCompleted(details)
    await onCompleted(details)
    expect(executeScriptMock).toHaveBeenCalledTimes(1)

    onBeforeNavigate({ tabId: currentTabId, frameId: 2 })
    await onCompleted(details)

    expect(executeScriptMock).toHaveBeenCalledTimes(2)
  })

  it("prunes injected records for frames that are no longer live", async () => {
    const { onCompleted } = await setupSubject()

    getAllFramesMock
      .mockResolvedValueOnce([
        createFrame(0, "https://example.com/app", -1),
        createFrame(3, "https://example.com/old-frame"),
      ])
      .mockResolvedValueOnce([
        createFrame(0, "https://example.com/app", -1),
        createFrame(2, "https://example.com/frame"),
      ])
      .mockResolvedValueOnce([
        createFrame(0, "https://example.com/app", -1),
        createFrame(3, "https://example.com/old-frame"),
      ])

    await onCompleted(createDetails({
      frameId: 3,
      documentId: "doc-stale",
      url: "https://example.com/old-frame",
    }))
    await onCompleted(createDetails({
      frameId: 2,
      documentId: "doc-live",
      url: "https://example.com/frame",
    }))
    await onCompleted(createDetails({
      frameId: 3,
      documentId: "doc-stale",
      url: "https://example.com/old-frame",
    }))

    expect(executeScriptMock).toHaveBeenCalledTimes(3)
    expect(executeScriptMock).toHaveBeenLastCalledWith(expect.objectContaining({
      target: { tabId: currentTabId, documentIds: ["doc-stale"] },
      files: [HOST_CONTENT_SCRIPT_FILE],
    }))
  })

  it("clears tab state on main-frame navigation and tab removal", async () => {
    const { onBeforeNavigate, onCompleted, onRemoved } = await setupSubject()
    const details = createDetails()

    await onCompleted(details)
    await onCompleted(details)
    expect(executeScriptMock).toHaveBeenCalledTimes(1)

    onBeforeNavigate({ tabId: currentTabId, frameId: 0 })
    await onCompleted(details)
    expect(executeScriptMock).toHaveBeenCalledTimes(2)

    onRemoved(currentTabId)
    await onCompleted(details)
    expect(executeScriptMock).toHaveBeenCalledTimes(3)
  })
})
