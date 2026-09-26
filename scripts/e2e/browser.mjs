import { mkdir } from "node:fs/promises"
import { resolve } from "node:path"
import process from "node:process"
import { chromium } from "playwright-core"

export const extensionPath = resolve(".output/chrome-mv3")

/**
 * Starts headless Chromium with the built extension and a new profile.
 * Returns the browser context, its first page and the extension ID.
 */
export async function launchBrowser() {
  // An empty path makes Playwright create a temporary profile and delete it on close.
  const context = await chromium.launchPersistentContext("", {
    // Headless Chromium loads extensions; the headless shell does not.
    channel: "chromium",
    headless: true,
    acceptDownloads: true,
    locale: "en-US",
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker")
  const page = context.pages()[0] ?? await context.newPage()
  return { context, page, extensionId: new URL(worker.url()).host }
}

/** Clicks the button whose accessible name is exactly `name`. */
export async function clickButton(page, name) {
  await page.getByRole("button", { name, exact: true }).click()
}

/** Waits until `text` is visible on the page. */
export async function waitForText(page, text) {
  await page.getByText(text).first().waitFor()
}

/** Saves a screenshot when E2E_SCREENSHOTS names a directory. */
export async function capture(page, name) {
  if (process.env.E2E_SCREENSHOTS) {
    await mkdir(process.env.E2E_SCREENSHOTS, { recursive: true })
    await page.screenshot({ path: resolve(process.env.E2E_SCREENSHOTS, `${name}.png`) })
  }
}
