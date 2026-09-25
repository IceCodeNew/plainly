import assert from "node:assert/strict"
import { createServer } from "node:http"
import process from "node:process"
import { after, afterEach, before, beforeEach, it } from "node:test"
import { capture, clickButton, createBrowser, extensionId } from "./browser.mjs"

const MODEL_INPUT = "input[aria-label='Model']"
let scenario = 0
let browser
let optionsURL
let baseURL
let models
let expectedAuthorization
let expectedTenant
let responseMode
let pendingRequest

// Wire contract checked against the provider documentation, not application code:
// https://developers.openai.com/api/reference/resources/models/methods/list
// https://api-docs.deepseek.com/api/list-models
// https://lmstudio.ai/docs/developer/openai-compat/models
const server = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json")
  // OpenAI Chat Completions wire contract, also used by DeepSeek and compatible providers:
  // https://platform.openai.com/docs/api-reference/chat/create
  if (request.method === "POST" && request.url === "/v1/chat/completions" && request.headers.authorization === expectedAuthorization) {
    response.end(JSON.stringify({
      id: "chatcmpl-test",
      object: "chat.completion",
      created: 1,
      model: "future-chat-model",
      choices: [{ index: 0, message: { role: "assistant", content: "你好" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 5, completion_tokens: 1, total_tokens: 6 },
    }))
    return
  }
  if (request.method !== "GET" || !["/v1/models", "/other/models"].includes(request.url)) {
    response.writeHead(404).end(JSON.stringify({ error: { message: "Unknown endpoint" } }))
    return
  }
  if (request.headers.authorization !== expectedAuthorization || request.headers["x-tenant"] !== expectedTenant || request.headers["x-empty"] !== undefined) {
    response.writeHead(401).end(JSON.stringify({ error: { message: "Invalid API key", type: "authentication_error", code: "invalid_api_key" } }))
    return
  }
  if (responseMode === "error") {
    response.writeHead(503).end(JSON.stringify({ error: { message: "Provider temporarily unavailable" } }))
    return
  }
  const body = JSON.stringify(responseMode === "malformed"
    ? { data: [{ id: 42 }] }
    : {
        object: "list",
        data: models.map(id => ({ id, object: "model", created: 1686935002, owned_by: "test-provider" })),
      })
  if (pendingRequest) {
    pendingRequest(() => response.end(body))
    pendingRequest = undefined
  }
  else {
    response.end(body)
  }
})

/** Opens the inline editor of the provider row with this name. */
async function openProvider(name) {
  const row = `[...document.querySelectorAll('button[aria-expanded]')].find(button => button.querySelector('span')?.textContent === ${JSON.stringify(name)})`
  await browser("eval", `(() => { const row = ${row}; if (row.getAttribute('aria-expanded') !== 'true') row.click() })()`)
  await browser("wait", "--fn", `${row}?.getAttribute('aria-expanded') === 'true' && !!document.querySelector("${MODEL_INPUT}")`)
}

/** Replaces the field value one key press at a time, like a user typing. */
async function typeInto(selector, text) {
  await browser("focus", selector)
  await browser("press", "Control+a")
  await browser("press", "Backspace")
  if (text)
    await browser("keyboard", "type", text)
}

async function modelValue() {
  return (await browser("get", "value", MODEL_INPUT)).value
}

async function reloadSettings() {
  await browser("reload")
  await browser("wait", "--text", "DeepSeek")
}

before(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  baseURL = `http://127.0.0.1:${server.address().port}/v1`
  optionsURL = `chrome-extension://${await extensionId()}/options.html#providers`
})

beforeEach(async () => {
  browser = createBrowser(`models-${process.pid}-${++scenario}`)
  models = ["future-chat-model", "another-chat-model"]
  expectedAuthorization = "Bearer test-key"
  expectedTenant = undefined
  responseMode = "models"
  pendingRequest = undefined
  await browser("open", optionsURL)
  await browser("set", "viewport", "1280", "900", "2")
  await browser("wait", "--text", "DeepSeek")
})

afterEach(async (context) => {
  try {
    if (context.error) {
      context.diagnostic((await browser("snapshot", "-i")).snapshot)
    }
  }
  finally {
    await browser("close")
  }
})

after(async () => {
  server.closeAllConnections()
  await new Promise(resolve => server.close(resolve))
})

for (const providerName of ["OpenAI", "DeepSeek", "Custom Provider"]) {
  it(`user selects a discovered model for ${providerName}: Given a configured provider, When a new model is selected, Then it survives reloading settings`, async () => {
    // Given
    await openProvider(providerName)
    await browser("fill", "#apiKey", "test-key")
    await browser("fill", "#baseURL", baseURL)

    // When
    await clickButton(browser, "Fetch available models")
    await browser("wait", "--text", "future-chat-model")
    await capture(browser, `models-${providerName}`)
    await browser("find", "role", "option", "click", "--name", "future-chat-model", "--exact")

    // Then
    assert.equal(await modelValue(), "future-chat-model")
    await reloadSettings()
    await openProvider(providerName)
    assert.equal(await modelValue(), "future-chat-model")
  })
}

it("user refreshes available models: Given a saved model, When the provider changes its list, Then new models can be searched without changing the saved selection", async () => {
  // Given
  await openProvider("DeepSeek")
  await browser("fill", "#apiKey", "test-key")
  await browser("fill", "#baseURL", `${baseURL}///`)
  const savedModel = await modelValue()
  await clickButton(browser, "Fetch available models")
  await browser("wait", "--text", "future-chat-model")
  await browser("press", "Escape")

  // When
  models = ["new-model", "another-model"]
  await clickButton(browser, "Fetch available models")
  await browser("wait", "--text", "new-model")
  await browser("find", "placeholder", "Search models…", "fill", "new-")

  // Then
  await browser("wait", "--fn", "document.querySelectorAll('[role=option]').length === 1")
  assert.equal((await browser("get", "text", "[role=option]")).text, "new-model")
  assert.equal(await modelValue(), savedModel)
})

for (const failure of ["error", "malformed"]) {
  it(`user recovers from ${failure}: Given a saved model, When fetching fails and is retried, Then the selection is preserved and the new list is available`, async () => {
    // Given
    await openProvider("DeepSeek")
    await browser("fill", "#apiKey", "test-key")
    await browser("fill", "#baseURL", baseURL)
    const savedModel = await modelValue()
    responseMode = failure

    // When
    await clickButton(browser, "Fetch available models")
    await browser("wait", "--text", "Click to retry")
    await capture(browser, `models-${failure}`)
    assert.equal(await modelValue(), savedModel)
    responseMode = "models"
    await clickButton(browser, "Click to retry")

    // Then
    await browser("wait", "--text", "future-chat-model")
    assert.equal(await modelValue(), savedModel)
  })
}

it("user uses a local provider without a key: Given an unauthenticated endpoint, When it returns no models, Then the user can still enter and save a model manually", async () => {
  // Given
  await openProvider("Custom Provider")
  await browser("fill", "#baseURL", baseURL)
  expectedAuthorization = undefined
  models = []

  // When
  await clickButton(browser, "Fetch available models")
  await browser("wait", "--text", "No models available")
  await capture(browser, "models-empty")
  await browser("fill", MODEL_INPUT, "local-model")
  await browser("press", "Tab")
  await reloadSettings()

  // Then
  await openProvider("Custom Provider")
  assert.equal(await modelValue(), "local-model")
})

it("user authenticates with custom headers: Given a provider with a key and header overrides, When models are fetched, Then the endpoint accepts the custom authorization and tenant", async () => {
  // Given
  await openProvider("DeepSeek")
  await browser("fill", "#apiKey", "unused-key")
  await browser("fill", "#baseURL", baseURL)
  await clickButton(browser, "Advanced: temperature, headers, provider options")
  await browser("wait", "[aria-label='provider-headers-editor'] .cm-content")
  await browser("fill", "[aria-label='provider-headers-editor'] .cm-content", JSON.stringify({ "authorization": "Bearer custom-key", "X-Tenant": "reading", "X-Empty": "" }))
  await browser("press", "Tab")
  await browser("eval", `new Promise(resolve => {
    const check = async () => {
      const saved = Object.values(await chrome.storage.local.get()).some(value => value?.providersConfig?.some(p => p.headers?.authorization === 'Bearer custom-key'));
      if (saved) { chrome.storage.onChanged.removeListener(check); resolve(true); }
    };
    chrome.storage.onChanged.addListener(check);
    check();
  })`)
  expectedAuthorization = "Bearer custom-key"
  expectedTenant = "reading"

  // When
  await clickButton(browser, "Fetch available models")

  // Then
  await browser("wait", "--text", "future-chat-model")
  await browser("find", "role", "option", "click", "--name", "future-chat-model", "--exact")
  assert.equal(await modelValue(), "future-chat-model")
})

it("user switches providers during a request: Given an unfinished old request, When another provider is opened, Then only that provider's models are offered", { timeout: 30000 }, async () => {
  // Given
  await openProvider("DeepSeek")
  await browser("fill", "#apiKey", "test-key")
  await browser("fill", "#baseURL", baseURL)
  const pending = Promise.withResolvers()
  pendingRequest = pending.resolve
  models = ["old-provider-model"]
  await clickButton(browser, "Fetch available models")
  const release = await pending.promise
  await browser("wait", "--fn", "[...document.querySelectorAll('button')].some(b => b.textContent.includes('Fetch available models') && b.disabled)")
  await capture(browser, "models-loading")

  // When
  await openProvider("OpenAI")
  await browser("fill", "#apiKey", "test-key")
  await browser("fill", "#baseURL", baseURL.replace("/v1", "/other"))
  models = ["new-provider-model"]
  await clickButton(browser, "Fetch available models")
  await browser("wait", "--text", "new-provider-model")
  release()
  await browser("wait", "--fn", `performance.getEntriesByType('resource').some(e => e.name === '${baseURL}/models')`)

  // Then
  assert.equal((await browser("get", "text", "[role=option]")).text, "new-provider-model")
  await browser("find", "role", "option", "click", "--name", "new-provider-model", "--exact")
  await reloadSettings()
  await openProvider("OpenAI")
  assert.equal(await modelValue(), "new-provider-model")
})

it("user saves rapid edits: Given a provider, When connection and model fields are edited consecutively, Then none revert after reloading", async () => {
  // Given
  await openProvider("DeepSeek")

  // When each key press saves the form and storage events echo earlier saves
  await typeInto("#apiKey", "test-key")
  await typeInto("#baseURL", baseURL)
  await typeInto(MODEL_INPUT, "manually-entered-model")
  await typeInto("#name", "My provider")
  await browser("press", "Tab")
  await reloadSettings()

  // Then
  await openProvider("My provider")
  assert.equal((await browser("get", "value", "#baseURL")).value, baseURL)
  assert.equal(await modelValue(), "manually-entered-model")
  await clickButton(browser, "Fetch available models")
  await browser("wait", "--text", "future-chat-model")
})

it("user edits settings in two tabs: Given a provider open in both tabs, When the other tab renames it, Then returning to the first tab preserves both edits", async () => {
  // Given
  await openProvider("DeepSeek")
  await browser("fill", "#baseURL", baseURL)
  await browser("tab", "new", optionsURL)
  await browser("wait", "--text", "DeepSeek")
  await openProvider("DeepSeek")
  await browser("wait", "--fn", `document.querySelector('#baseURL')?.value === '${baseURL}'`)

  // When
  await browser("fill", "#name", "Edited in another tab")
  await browser("press", "Tab")
  await browser("tab", "t1")

  // Then
  await browser("wait", "--fn", "document.querySelector('#name')?.value === 'Edited in another tab'")
  assert.equal((await browser("get", "value", "#baseURL")).value, baseURL)
  await browser("fill", MODEL_INPUT, "shared-model")
  await browser("tab", "t2")
  await browser("wait", `--fn`, `document.querySelector("${MODEL_INPUT}")?.value === 'shared-model'`)
  assert.equal((await browser("get", "value", "#name")).value, "Edited in another tab")
})

it("user stages recommendations in an invalid form: Given a duplicate provider name, When recommendations are applied and the name is corrected, Then the settings survive reloading", async () => {
  // Given
  await openProvider("OpenAI")
  await browser("fill", "#name", "DeepSeek")
  await browser("wait", "--text", "Another service is already named")

  // When
  await clickButton(browser, "View recommended provider options")
  await browser("wait", "--text", "Recommended provider options detected")
  await clickButton(browser, "Apply")
  assert.equal((await browser("get", "value", "#name")).value, "DeepSeek")
  await browser("wait", "--text", "Another service is already named")
  await clickButton(browser, "View recommended provider options")
  await browser("wait", "--text", "Applied")
  await browser("press", "Escape")
  await browser("fill", "#name", "OpenAI Saved")
  await reloadSettings()

  // Then
  await openProvider("OpenAI Saved")
  await clickButton(browser, "View recommended provider options")
  await browser("wait", "--text", "Applied")
  assert.match((await browser("get", "text", "[role=dialog]")).text, /minimal/)
})

for (const providerName of ["DeepSeek", "Custom Provider"]) {
  it(`user tests a base URL that ends with slashes for ${providerName}: Given models fetched from that URL, When the connection is tested, Then the translation request reaches the same API`, async () => {
    // Given
    await openProvider(providerName)
    await browser("fill", "#apiKey", "test-key")
    await browser("fill", "#baseURL", `${baseURL}//`)
    await clickButton(browser, "Fetch available models")
    await browser("wait", "--text", "future-chat-model")
    await browser("find", "role", "option", "click", "--name", "future-chat-model", "--exact")

    // When
    await clickButton(browser, "Test connection")

    // Then
    await browser("wait", "--fn", "!!document.querySelector('.tabler-icon-check, .tabler-icon-x')")
    assert.equal(await browser("eval", "!!document.querySelector('.tabler-icon-check')").then(data => data.result), true)
  })
}

it("user clears the model: Given a provider with a model, When the model field is cleared, Then an error shows and the saved model stays", async () => {
  // Given
  await openProvider("DeepSeek")
  const savedModel = await modelValue()

  // When
  await typeInto(MODEL_INPUT, "")
  await browser("press", "Tab")

  // Then
  await browser("wait", "--text", "Enter a model ID.")
  await reloadSettings()
  await openProvider("DeepSeek")
  assert.equal(await modelValue(), savedModel)
})
