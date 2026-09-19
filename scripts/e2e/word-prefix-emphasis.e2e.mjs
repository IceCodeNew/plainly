import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { resolve } from "node:path"
import process from "node:process"
import { after, before, it } from "node:test"
import { promisify } from "node:util"

const exec = promisify(execFile)
const session = `prefix-${process.pid}`
const extension = resolve(".output/chrome-mv3")
let popupURL
let pageURL
const text = "Reading unfamiliar words takes practice. Keep the whole sentence in view."
const translated = "Une lecture attentive préserve le sens."
const requests = []
const server = createServer(async (request, response) => {
  if (request.url === "/v1/chat/completions" && request.method === "POST") {
    const chunks = []
    for await (const chunk of request)
      chunks.push(chunk)
    const body = JSON.parse(Buffer.concat(chunks).toString())
    requests.push(body)
    // OpenAI Chat Completions wire contract, also used by compatible providers:
    // https://platform.openai.com/docs/api-reference/chat/create
    if (body.model !== "reading-test" || !Array.isArray(body.messages) || body.stream) {
      response.writeHead(400).end()
      return
    }
    response.setHeader("Content-Type", "application/json")
    response.end(JSON.stringify({
      id: "chatcmpl-reading-test", object: "chat.completion", created: 1, model: body.model,
      choices: [{ index: 0, message: { role: "assistant", content: translated }, finish_reason: "stop" }],
      usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
    }))
    return
  }
  response.setHeader("Content-Type", "text/html; charset=utf-8")
  response.end(`<!doctype html><html lang="en"><head><title>Reading preferences</title>
    <style>body { font: 20px/1.8 system-ui; max-width: 760px; margin: 70px auto; color: #253044; background: #faf9f6; }
    h1 { font-size: 32px; } pre, textarea { font-size: 16px; } a { color: #285bb0; }</style></head>
    <body><h1>A quiet moment to read</h1><article><p id="passage">${text}</p>
    <p id="mixed">Café naïve élan. 中文和日本語保持原样。 <a id="link" href="#note">Read the note</a>.</p>
    <pre id="code">const message = "Keep code unchanged";</pre>
    <p contenteditable="true" id="editor">Editable words stay unchanged.</p>
    <p id="note">Choose the presentation that feels comfortable.</p></article></body></html>`)
})

async function browser(...args) {
  const { stdout } = await exec("agent-browser", ["--session", session, "--extension", extension,
    "--args", "--headless=new,--lang=en-US", "--json", ...args], { timeout: 30000 })
  const result = JSON.parse(stdout)
  assert.equal(result.success, true, result.error)
  return result.data
}

async function evaluate(expression) {
  const data = await browser("eval", expression)
  return data.result
}

async function capture(name) {
  if (process.env.E2E_SCREENSHOTS) {
    await mkdir(process.env.E2E_SCREENSHOTS, { recursive: true })
    await browser("screenshot", resolve(process.env.E2E_SCREENSHOTS, `${name}.png`))
  }
}

before(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  pageURL = `http://127.0.0.1:${server.address().port}`
  const manifest = JSON.parse(await readFile(`${extension}/manifest.json`, "utf8"))
  const id = createHash("sha256").update(Buffer.from(manifest.key, "base64")).digest("hex").slice(0, 32).replace(/[0-9a-f]/g, char => String.fromCharCode(97 + Number.parseInt(char, 16)))
  popupURL = `chrome-extension://${id}/popup.html`
})

after(async () => {
  await browser("close")
  await new Promise(resolve => server.close(resolve))
})

it("user chooses word-prefix emphasis: Given normal text, When toggled in the popup, Then pages update, preserve content and restore without reload", async () => {
  await browser("open", "about:blank")
  await browser("tab", "new", "--label", "article", pageURL)
  await browser("set", "viewport", "1100", "850", "2")
  assert.equal(await evaluate("document.querySelectorAll('[data-vibe-reading-prefix]').length"), 0)
  await capture("prefix-off")
  await browser("tab", "new", "--label", "popup", popupURL)
  await browser("set", "viewport", "380", "720", "2")
  await browser("wait", "--text", "Word-prefix emphasis")
  assert.equal(await evaluate("document.querySelector('#word-prefix-emphasis').checked"), false)
  // Exercise keyboard access on initial layout; subsequent toggles exercise pointer access.
  await browser("focus", "[role=switch][aria-describedby=word-prefix-description]")
  await browser("press", "Space")
  await browser("wait", "--fn", "document.querySelector('#word-prefix-emphasis').checked")
  await capture("prefix-popup")
  await browser("tab", "article")
  await browser("wait", "--fn", "!!document.querySelector('#passage [data-vibe-reading-prefix]')")
  assert.equal(await evaluate("document.querySelector('#passage').textContent"), text)
  assert.equal(await evaluate("document.querySelector('#passage [data-vibe-reading-prefix]').textContent"), "Read")
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#passage [data-vibe-reading-prefix]')).fontWeight"), "700")
  assert.equal(await evaluate("document.querySelectorAll('#code span, #editor span').length"), 0)
  await browser("click", "#link")
  assert.equal(await evaluate("location.hash"), "#note")
  await capture("prefix-on")
  await evaluate("document.querySelector('#passage').textContent = 'Updated reading material.'")
  await browser("wait", "--fn", "document.querySelector('#passage [data-vibe-reading-prefix]')?.textContent === 'Upda'")
  await browser("reload")
  await browser("wait", "--fn", "!!document.querySelector('#passage [data-vibe-reading-prefix]')")
  await browser("tab", "popup")
  await browser("find", "role", "switch", "click", "--name", "Word-prefix emphasis", "--exact")
  await browser("tab", "article")
  await browser("wait", "--fn", "document.querySelectorAll('[data-vibe-reading-prefix]').length === 0")
  assert.equal(await evaluate("document.querySelector('#passage').innerHTML"), text)
  await evaluate("document.querySelector('#passage').textContent = 'Updates remain plain.'")
  assert.equal(await evaluate("document.querySelector('#passage').children.length"), 0)
})

for (const mode of ["translationOnly", "bilingual"]) {
  it(`user restores ${mode} text: Given emphasis and translation, When emphasis is disabled before showing originals, Then original text returns without emphasis markup`, async () => {
    await browser("tab", "popup")
    // Configure a real local HTTP provider; the extension's transport, storage and translation run unchanged.
    await evaluate(`(async () => {
      const { config } = await chrome.storage.local.get('config');
      const provider = config.providersConfig.find(p => p.provider === 'openai-compatible');
      provider.baseURL = ${JSON.stringify(`${pageURL}/v1`)};
      provider.apiKey = 'local-test-key';
      provider.model = { model: 'use-custom-model', isCustomModel: true, customModel: 'reading-test' };
      config.language = { ...config.language, sourceCode: 'eng', targetCode: 'fra' };
      config.translate.providerId = provider.id;
      config.translate.mode = ${JSON.stringify(mode)};
      config.translate.batchQueueConfig.maxItemsPerBatch = 1;
      await chrome.storage.local.set({ config });
    })()`)
    await browser("find", "role", "switch", "click", "--name", "Word-prefix emphasis", "--exact")
    await browser("tab", "article")
    await browser("open", `${pageURL}/?mode=${mode}`)
    await browser("wait", "--fn", "!!document.querySelector('#passage [data-vibe-reading-prefix]')")
    await browser("press", "Alt+e")
    await browser("wait", "--fn", `document.querySelector('#passage .vibe-reading-translated-content-wrapper')?.textContent.includes(${JSON.stringify(translated)})`)
    await browser("wait", "--fn", "!!document.querySelector('#passage .vibe-reading-translated-content-wrapper [data-vibe-reading-prefix]')")
    assert.ok(requests.length > 0)
    assert.ok(!JSON.stringify(requests).includes("data-vibe-reading-prefix"))
    await browser("tab", "popup")
    await browser("find", "role", "switch", "click", "--name", "Word-prefix emphasis", "--exact")
    await browser("tab", "article")
    await browser("wait", "--fn", "!document.querySelector('[data-vibe-reading-prefix]')")
    await browser("press", "Alt+e")
    await browser("wait", "--fn", "!document.querySelector('.vibe-reading-translated-content-wrapper')")
    assert.equal(await evaluate("document.querySelector('#passage').textContent"), text)
    assert.equal(await evaluate("document.querySelectorAll('[data-vibe-reading-prefix-text], [data-vibe-reading-prefix]').length"), 0)
  })
}
