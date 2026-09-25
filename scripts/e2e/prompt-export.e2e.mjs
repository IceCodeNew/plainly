import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import { mkdtemp, readFile, rm, watch } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import process from "node:process"
import { it } from "node:test"
import { clickButton, createBrowser, extensionId } from "./browser.mjs"

it("user exports prompts: Given custom prompts with Unicode, When the user exports them, Then the downloaded JSON has the expected filename and exact bytes", async () => {
  const downloadDirectory = await mkdtemp(join(tmpdir(), "plainly-export-"))
  const browser = createBrowser(`export-${process.pid}`, { downloadPath: downloadDirectory })
  const controller = new AbortController()

  async function addPrompt({ name, systemPrompt, prompt }) {
    await clickButton(browser, "New")
    await browser("wait", "#prompt-name")
    await browser("fill", "#prompt-name", name)
    await browser("fill", "[role=dialog] textarea.min-h-40", systemPrompt)
    await browser("fill", "[role=dialog] textarea.max-h-60", prompt)
    await clickButton(browser, "Save")
    await browser("wait", "--fn", `!!document.querySelector(${JSON.stringify(`label[title=${JSON.stringify(name)}]`)}) && !document.querySelector('[role=dialog]')`)
  }

  async function exportPrompts() {
    const downloaded = (async () => {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])
      for await (const event of watch(downloadDirectory, { signal })) {
        if (event.filename?.endsWith(".json"))
          return event.filename
      }
      throw new Error("No JSON download completed")
    })()
    const [filename] = await Promise.all([downloaded, clickButton(browser, "Export")])
    return filename
  }

  try {
    await browser("open", `chrome-extension://${await extensionId()}/options.html#quality`)
    await browser("set", "viewport", "1280", "900", "2")
    await browser("wait", "--text", "Prompt")

    // Given
    const first = { name: "中英 🌏", systemPrompt: "你是翻译助手。", prompt: "Translate café: {{input}}" }
    const last = { name: "Résumé", systemPrompt: "Keep Unicode intact", prompt: "日本語とemoji 🚀" }
    await addPrompt(first)
    await addPrompt(last)

    // When
    const filename = await exportPrompts()

    // Then
    assert.equal(filename, "Plainly_prompts.json")
    assert.deepEqual(await readFile(join(downloadDirectory, filename)), Buffer.from(JSON.stringify([first, last], null, 2)))
  }
  finally {
    controller.abort()
    await browser("close").catch(() => {})
    await rm(downloadDirectory, { recursive: true, force: true })
  }
})
