import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile } from "node:fs/promises"
import { resolve } from "node:path"
import process from "node:process"
import { promisify } from "node:util"

const exec = promisify(execFile)

export const extensionPath = resolve(".output/chrome-mv3")

/** Returns a function that runs one agent-browser command in a session with the built extension. */
export function createBrowser(session, { downloadPath } = {}) {
  const browser = async (...args) => {
    if (args[0] === "fill") {
      await browser("focus", args[1])
      await browser("press", "Control+a")
      return browser("keyboard", "inserttext", args[2])
    }
    const { stdout } = await exec("agent-browser", [
      "--session",
      session,
      "--extension",
      extensionPath,
      ...(downloadPath ? ["--download-path", downloadPath] : []),
      "--args",
      "--headless=new,--force-device-scale-factor=2,--lang=en-US",
      "--json",
      ...args,
    ], { timeout: 60000, env: { ...process.env, AGENT_BROWSER_DEFAULT_TIMEOUT: "45000" } })
    const result = JSON.parse(stdout)
    assert.equal(result.success, true, result.error)
    return result.data
  }
  return browser
}

/** Calculates the Chromium extension ID from the manifest key. */
export async function extensionId() {
  const manifest = JSON.parse(await readFile(`${extensionPath}/manifest.json`, "utf8"))
  return createHash("sha256")
    .update(Buffer.from(manifest.key, "base64"))
    .digest("hex")
    .slice(0, 32)
    .replace(/[0-9a-f]/g, char => String.fromCharCode(97 + Number.parseInt(char, 16)))
}

/** Clicks the button whose accessible name is exactly `name`. */
export async function clickButton(browser, name) {
  await browser("find", "role", "button", "click", "--name", name, "--exact")
}

/** Saves a screenshot when E2E_SCREENSHOTS names a directory. */
export async function capture(browser, name) {
  if (process.env.E2E_SCREENSHOTS) {
    await mkdir(process.env.E2E_SCREENSHOTS, { recursive: true })
    await browser("screenshot", resolve(process.env.E2E_SCREENSHOTS, `${name}.png`))
  }
}
