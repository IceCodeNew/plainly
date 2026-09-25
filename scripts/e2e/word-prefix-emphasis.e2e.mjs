import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import { createServer } from "node:http"
import process from "node:process"
import { after, before, it } from "node:test"
import { capture, createBrowser, extensionId } from "./browser.mjs"

const browser = createBrowser(`prefix-${process.pid}`)
const SWITCH = "Word-prefix emphasis"
const text = "Reading unfamiliar words takes practice. Keep the whole sentence in view."
const translated = "Une lecture attentive préserve le sens."
const requests = []
// Tab switches start page language detection; count only translation requests.
const translationRequests = () => requests.filter(body => !JSON.stringify(body.messages).includes("language detection assistant"))
let optionsURL
let pageURL

const articlePage = `<!doctype html><html lang="en"><head><title>Reading preferences</title>
  <style>body { font: 20px/1.8 system-ui; max-width: 760px; margin: 70px auto; color: #253044; background: #faf9f6; }
  h1 { font-size: 32px; } pre, textarea { font-size: 16px; } a { color: #285bb0; }</style></head>
  <body><h1>A quiet moment to read</h1><article><p id="passage">${text}</p>
  <p id="mixed">Café naïve élan. 中文和日本語保持原样。 <a id="link" href="#note">Read the note</a>.</p>
  <pre id="code">const message = "Keep code unchanged";</pre>
  <p contenteditable="true" id="editor">Editable words stay unchanged.</p>
  <p id="note">Choose the presentation that feels comfortable.</p></article></body></html>`

// Rules copied from https://silo.pgsty.com/ (css/landing-v3.css and css/silo-v3.css), which
// stacked every prefix on its own line or split words into spaced flex items.
const landingPage = `<!doctype html><html lang="en"><head><title>Landing page</title>
  <style>body { font: 18px/1.6 system-ui; margin: 40px; width: 900px; }
  .hero-sub span { display: block; }
  .board-top, .board-foot { display: flex; justify-content: space-between; gap: 18px; font-family: monospace; letter-spacing: 0.12em; }
  .board-top span, .board-foot span:last-child { display: inline-flex; align-items: center; gap: 8px; }
  /* A tag-independent variant of the same rule. */
  .board-top :last-child { display: inline-flex; gap: 8px; }</style></head>
  <body><p class="hero-sub" id="hero"><span>PGSTY SILO is a MinIO fork maintained by volunteers.</span><span>Provide packages and fixes.</span></p>
  <div class="board-top" id="top"><span>STORAGE NODE</span><span>PGSTY</span></div>
  <div class="board-foot" id="foot"><span>COMMUNITY FORK</span><span>MAINTAINED BY PIGSTY</span></div></body></html>`

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
      id: "chatcmpl-reading-test",
      object: "chat.completion",
      created: 1,
      model: body.model,
      choices: [{ index: 0, message: { role: "assistant", content: translated }, finish_reason: "stop" }],
      usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
    }))
    return
  }
  response.setHeader("Content-Type", "text/html; charset=utf-8")
  response.end(request.url.startsWith("/landing") ? landingPage : articlePage)
})

async function evaluate(expression) {
  return (await browser("eval", expression)).result
}

async function switchSelector() {
  const labelId = await evaluate(`[...document.querySelectorAll('label')].find(label => label.textContent === ${JSON.stringify(SWITCH)}).id`)
  return `[role=switch][aria-labelledby="${labelId}"]`
}

/** Sets the emphasis switch in the settings tab, and clicks it only when its state differs. */
async function setEmphasis(on) {
  await browser("tab", "options")
  const selector = await switchSelector()
  if ((await browser("get", "attr", selector, "aria-checked")).value !== String(on))
    await browser("click", selector)
  await browser("wait", "--fn", `document.querySelector(${JSON.stringify(selector)})?.getAttribute('aria-checked') === '${on}'`)
}

async function setTranslationMode(mode) {
  await browser("tab", "options")
  await evaluate(`(async () => {
    const { config } = await chrome.storage.local.get('config');
    config.translate.mode = ${JSON.stringify(mode)};
    await chrome.storage.local.set({ config });
  })()`)
}

before(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  pageURL = `http://127.0.0.1:${server.address().port}`
  optionsURL = `chrome-extension://${await extensionId()}/options.html#reading`
  await browser("open", "about:blank")
  await browser("tab", "new", "--label", "article", pageURL)
  await browser("set", "viewport", "1100", "850", "2")
  await browser("tab", "new", "--label", "options", optionsURL)
  await browser("wait", "--text", SWITCH)
  // Use a real local HTTP provider; the extension's transport, storage and translation run unchanged.
  await evaluate(`(async () => {
    const { config } = await chrome.storage.local.get('config');
    const provider = config.providersConfig.find(p => p.provider === 'openai-compatible');
    provider.baseURL = ${JSON.stringify(`${pageURL}/v1`)};
    provider.apiKey = 'local-test-key';
    provider.model = 'reading-test';
    config.language = { ...config.language, sourceCode: 'eng', targetCode: 'fra' };
    config.translate.providerId = provider.id;
    config.translate.batchQueueConfig.maxItemsPerBatch = 1;
    await chrome.storage.local.set({ config });
  })()`)
})

after(async () => {
  await browser("close")
  await new Promise(resolve => server.close(resolve))
})

it("user chooses word-prefix emphasis: Given normal text, When it is toggled in the settings, Then pages update, preserve content and restore without reload", async () => {
  // Given
  await browser("tab", "article")
  assert.equal(await evaluate("document.querySelectorAll('plainly-prefix').length"), 0)
  await capture(browser, "prefix-off")

  // When: keyboard access on the first toggle
  await browser("tab", "options")
  const selector = await switchSelector()
  assert.equal((await browser("get", "attr", selector, "aria-checked")).value, "false")
  await browser("focus", selector)
  await browser("press", "Space")
  await browser("tab", "article")

  // Then
  await browser("wait", "--fn", "!!document.querySelector('#passage plainly-prefix')")
  assert.equal(await evaluate("document.querySelector('#passage').textContent"), text)
  assert.equal(await evaluate("document.querySelector('#passage plainly-prefix').textContent"), "Read")
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#passage plainly-prefix')).fontWeight"), "700")
  assert.equal(await evaluate("document.querySelectorAll('#code plainly-prefix, #editor plainly-prefix').length"), 0)
  await browser("click", "#link")
  assert.equal(await evaluate("location.hash"), "#note")
  await capture(browser, "prefix-on")
  await evaluate("document.querySelector('#passage').textContent = 'Updated reading material.'")
  await browser("wait", "--fn", "document.querySelector('#passage plainly-prefix')?.textContent === 'Upda'")
  await browser("reload")
  await browser("wait", "--fn", "!!document.querySelector('#passage plainly-prefix')")

  // When disabled with the pointer, Then the original markup returns
  await setEmphasis(false)
  await browser("tab", "article")
  await browser("wait", "--fn", "document.querySelectorAll('plainly-prefix').length === 0")
  assert.equal(await evaluate("document.querySelector('#passage').innerHTML"), text)
  await evaluate("document.querySelector('#passage').textContent = 'Updates remain plain.'")
  assert.equal(await evaluate("document.querySelector('#passage').children.length"), 0)
})

it("user keeps the page layout: Given page CSS for every span and last child, When emphasis is enabled, Then lines, flex items and word spacing stay the same", async () => {
  // Given
  await browser("tab", "article")
  await browser("open", `${pageURL}/landing`)
  const measure = `JSON.stringify(['#hero', '#top', '#foot'].map(selector => {
    const element = document.querySelector(selector)
    const range = document.createRange()
    range.selectNodeContents(element)
    return { lines: new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size, height: Math.round(element.getBoundingClientRect().height), items: element.children.length }
  }))`
  const before = JSON.parse(await evaluate(measure))

  // When
  await setEmphasis(true)
  await browser("tab", "article")
  await browser("wait", "--fn", "!!document.querySelector('#hero plainly-prefix') && !!document.querySelector('#foot plainly-prefix')")
  await capture(browser, "prefix-landing")

  // Then
  const after = JSON.parse(await evaluate(measure))
  assert.deepEqual(after.map(({ lines, items }) => ({ lines, items })), before.map(({ lines, items }) => ({ lines, items })))
  for (const [index, { height }] of after.entries())
    assert.ok(Math.abs(height - before[index].height) <= 1, `height of block ${index} changed from ${before[index].height} to ${height}`)
  // A text wrapper that is a flex item is blockified like the anonymous item it replaces; prefixes stay inline.
  assert.deepEqual(JSON.parse(await evaluate("JSON.stringify([...new Set([...document.querySelectorAll('plainly-prefix')].map(element => getComputedStyle(element).display))])")), ["inline"])
  assert.equal(await evaluate("document.querySelector('#foot').textContent"), "COMMUNITY FORKMAINTAINED BY PIGSTY")

  await setEmphasis(false)
  await browser("tab", "article")
  await browser("wait", "--fn", "!document.querySelector('plainly-prefix')")
})

for (const mode of ["translationOnly", "bilingual"]) {
  it(`user restores ${mode} text: Given emphasis and translation, When emphasis is disabled before showing originals, Then original text returns without emphasis markup`, async () => {
    // Given
    await setTranslationMode(mode)
    await setEmphasis(true)
    await browser("tab", "article")
    await browser("open", `${pageURL}/?mode=${mode}`)
    await browser("wait", "--fn", "!!document.querySelector('#passage plainly-prefix')")

    // When
    await browser("press", "Alt+e")
    await browser("wait", "--fn", `document.querySelector('#passage .plainly-translated-content-wrapper')?.textContent.includes(${JSON.stringify(translated)})`)
    await browser("wait", "--fn", "!!document.querySelector('#passage .plainly-translated-content-wrapper plainly-prefix')")
    assert.ok(translationRequests().length > 0)
    assert.ok(!JSON.stringify(requests).includes("plainly-prefix"))
    await setEmphasis(false)
    await browser("tab", "article")
    await browser("wait", "--fn", "!document.querySelector('plainly-prefix')")
    await browser("press", "Alt+e")

    // Then
    await browser("wait", "--fn", "!document.querySelector('.plainly-translated-content-wrapper')")
    assert.equal(await evaluate("document.querySelector('#passage').textContent"), text)
    assert.equal(await evaluate("document.querySelectorAll('plainly-prefix-text, plainly-prefix').length"), 0)
  })
}

it("user enables emphasis on a translated page: Given a bilingual translation, When emphasis is enabled, Then each paragraph keeps one translation and its original text", async () => {
  // Given
  await setTranslationMode("bilingual")
  await setEmphasis(false)
  await browser("tab", "article")
  await browser("open", `${pageURL}/?translated-first`)
  await browser("wait", "--text", "A quiet moment to read")
  await browser("press", "Alt+e")
  await browser("wait", "--fn", "['#passage', '#mixed', '#note'].every(selector => document.querySelector(selector + ' .plainly-translated-content-wrapper')?.textContent.trim())")
  const requestCount = translationRequests().length

  // When
  await setEmphasis(true)
  await browser("tab", "article")
  await browser("wait", "--fn", "!!document.querySelector('#passage .plainly-translated-content-wrapper plainly-prefix')")
  // No DOM signal proves that a request did not start, so allow one bounded window for it.
  await browser("wait", "1500")

  // Then
  assert.equal(await evaluate("document.querySelectorAll('#passage .plainly-translated-content-wrapper').length"), 1)
  assert.equal(translationRequests().length, requestCount)
  await setEmphasis(false)
  await browser("tab", "article")
  await browser("wait", "--fn", "!document.querySelector('plainly-prefix')")
  await browser("press", "Alt+e")
  await browser("wait", "--fn", "!document.querySelector('.plainly-translated-content-wrapper')")
  assert.equal(await evaluate("document.querySelector('#passage').textContent"), text)
})
