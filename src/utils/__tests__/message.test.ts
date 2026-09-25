import { afterEach, expect, it, vi } from "vitest"
import { sendMessage } from "../message"

const NO_RECEIVER = "Could not establish connection. Receiving end does not exist."

// Chrome contract: lastError is set only while the callback runs, and Chrome logs
// "Unchecked runtime.lastError" when the callback does not read it.
function installChromeFake() {
  let lastError: { message: string } | undefined
  let lastErrorRead = false
  const runtime = {
    get lastError() {
      lastErrorRead = true
      return lastError
    },
    sendMessage: (_message: unknown, callback: (response: unknown) => void) => {
      lastError = { message: NO_RECEIVER }
      callback(undefined)
      lastError = undefined
    },
  }
  const tabs = {
    sendMessage: (_tabId: number, _message: unknown, _options: unknown, callback: (response: unknown) => void) => {
      lastError = { message: NO_RECEIVER }
      callback(undefined)
      lastError = undefined
    },
  }
  vi.stubGlobal("chrome", { runtime, tabs })
  return { wasLastErrorRead: () => lastErrorRead }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

it("user opens a tab without the content script: Given no receiver in the tab, When the background sends a message, Then the send fails with the browser error and the error is handled", async () => {
  // Given
  const chrome = installChromeFake()

  // When
  const result = sendMessage("refreshDetectedPageLanguage", undefined, 42)

  // Then
  await expect(result).rejects.toThrow(NO_RECEIVER)
  expect(chrome.wasLastErrorRead()).toBe(true)
})
