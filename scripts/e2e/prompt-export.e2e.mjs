import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdtemp, readFile, rm, watch } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import process from "node:process"
import { it } from "node:test"
import { promisify } from "node:util"

const exec = promisify(execFile)
const extension = resolve(".output/chrome-mv3")

it("user exports selected prompts: Given custom prompts with Unicode, When selected prompts are exported, Then the downloaded JSON has the original filename and exact selected bytes", async () => {
  const session = `export-${process.pid}`
  const downloadDirectory = await mkdtemp(join(tmpdir(), "vibe-reading-export-"))
  const controller = new AbortController()
  const browser = async (...args) => {
    if (args[0] === "fill") {
      await browser("focus", args[1])
      await browser("press", "Control+a")
      return browser("keyboard", "inserttext", args[2])
    }
    const { stdout } = await exec("agent-browser", [
      "--session", session,
      "--extension", extension,
      "--download-path", downloadDirectory,
      "--args", "--headless=new,--force-device-scale-factor=2,--lang=en-US",
      "--json", ...args,
    ], { timeout: 60000, env: { ...process.env, AGENT_BROWSER_DEFAULT_TIMEOUT: "45000" } })
    const result = JSON.parse(stdout)
    assert.equal(result.success, true, result.error)
    return result.data
  }

  async function clickButton(name) {
    await browser("find", "role", "button", "click", "--name", name, "--exact")
  }

  async function addPrompt({ name, systemPrompt, prompt }) {
    await clickButton("Add Prompt")
    await browser("wait", "#prompt-name")
    await browser("fill", "#prompt-name", name)
    await browser("fill", "[role=dialog] textarea.min-h-40", systemPrompt)
    await browser("fill", "[role=dialog] textarea.max-h-60", prompt)
    await clickButton("Save Changes")
    await browser("wait", "--fn", `document.body.innerText.includes(${JSON.stringify(name)}) && !document.querySelector('[role=dialog]')`)
  }

  try {
    const manifest = JSON.parse(await readFile(`${extension}/manifest.json`, "utf8"))
    const id = createHash("sha256").update(Buffer.from(manifest.key, "base64")).digest("hex").slice(0, 32).replace(/[0-9a-f]/g, char => String.fromCharCode(97 + Number.parseInt(char, 16)))
    await browser("open", `chrome-extension://${id}/options.html#/translation`)
    await browser("set", "viewport", "1280", "900", "2")
    await browser("wait", "--text", "Personalized Prompts")

    // Given
    const first = { name: "中英 🌏", systemPrompt: "你是翻译助手。", prompt: "Translate café: {{input}}" }
    const excluded = { name: "Not exported", systemPrompt: "Exclude me", prompt: "This must not be downloaded" }
    const last = { name: "Résumé", systemPrompt: "Keep Unicode intact", prompt: "日本語とemoji 🚀" }
    await addPrompt(first)
    await addPrompt(excluded)
    await addPrompt(last)

    // When
    await clickButton("Export")
    await browser("click", `[data-slot='card']:has(label[title=${JSON.stringify(last.name)}]) [data-slot='card-content']`)
    await browser("click", `[data-slot='card']:has(label[title=${JSON.stringify(first.name)}]) [data-slot='card-content']`)
    const downloaded = (async () => {
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)])
      for await (const event of watch(downloadDirectory, { signal })) {
        if (event.filename?.endsWith(".json"))
          return event.filename
      }
      throw new Error("No JSON download completed")
    })()
    const [filename] = await Promise.all([downloaded, clickButton("Export Selected")])

    // Then
    assert.equal(filename, "Vibe Reading_prompts.json")
    assert.deepEqual(await readFile(join(downloadDirectory, filename)), Buffer.from(JSON.stringify([first, last], null, 2)))
  }
  finally {
    controller.abort()
    await browser("close").catch(() => {})
    await rm(downloadDirectory, { recursive: true, force: true })
  }
})
