/* global chrome -- page.evaluate() runs these callbacks in the extension page. */
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { after, afterEach, before, beforeEach, it } from "node:test"
import { capture, clickButton, launchBrowser, waitForText } from "./browser.mjs"

const MODEL_INPUT = "input[aria-label='Model']"
let context
let page
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
  const row = page.locator("button[aria-expanded]").filter({ has: page.locator("span").filter({ hasText: new RegExp(`^${RegExp.escape(name)}$`) }) })
  if (await row.getAttribute("aria-expanded") !== "true")
    await row.click()
  await row.and(page.locator("[aria-expanded=true]")).waitFor()
  await page.locator(MODEL_INPUT).waitFor()
}

/** Replaces the field value one key press at a time, like a user typing. */
async function typeInto(selector, text) {
  const field = page.locator(selector)
  await field.clear()
  await field.pressSequentially(text)
}

async function fill(selector, text) {
  await page.locator(selector).fill(text)
}

async function modelValue() {
  return page.locator(MODEL_INPUT).inputValue()
}

async function selectModel(name) {
  await page.getByRole("option", { name, exact: true }).click()
}

/** Waits until a stored provider has all these field values. */
async function waitForSavedProvider(fields) {
  await page.evaluate(fields => new Promise((resolve) => {
    const check = async () => {
      const { config } = await chrome.storage.local.get("config")
      if (config.providersConfig.some(provider => Object.entries(fields).every(([key, value]) => provider[key] === value))) {
        chrome.storage.onChanged.removeListener(check)
        resolve()
      }
    }
    chrome.storage.onChanged.addListener(check)
    check()
  }), fields)
}

async function reloadSettings() {
  await page.reload()
  await waitForText(page, "DeepSeek")
}

before(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  baseURL = `http://127.0.0.1:${server.address().port}/v1`
})

beforeEach(async () => {
  let extensionId
  ;({ context, page, extensionId } = await launchBrowser())
  optionsURL = `chrome-extension://${extensionId}/options.html#providers`
  models = ["future-chat-model", "another-chat-model"]
  expectedAuthorization = "Bearer test-key"
  expectedTenant = undefined
  responseMode = "models"
  pendingRequest = undefined
  await page.goto(optionsURL)
  await waitForText(page, "DeepSeek")
})

afterEach(async (test) => {
  try {
    if (test.error)
      test.diagnostic(await page.locator("body").ariaSnapshot())
  }
  finally {
    await context.close()
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
    await fill("#apiKey", "test-key")
    await fill("#baseURL", baseURL)

    // When
    await clickButton(page, "Fetch available models")
    await waitForText(page, "future-chat-model")
    await capture(page, `models-${providerName}`)
    await selectModel("future-chat-model")

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
  await fill("#apiKey", "test-key")
  await fill("#baseURL", `${baseURL}///`)
  const savedModel = await modelValue()
  await clickButton(page, "Fetch available models")
  await waitForText(page, "future-chat-model")
  await page.keyboard.press("Escape")

  // When
  models = ["new-model", "another-model"]
  await clickButton(page, "Fetch available models")
  await waitForText(page, "new-model")
  await page.getByPlaceholder("Search models…").fill("new-")

  // Then
  await page.waitForFunction("document.querySelectorAll('[role=option]').length === 1")
  assert.equal(await page.getByRole("option").textContent(), "new-model")
  assert.equal(await modelValue(), savedModel)
})

for (const failure of ["error", "malformed"]) {
  it(`user recovers from ${failure}: Given a saved model, When fetching fails and is retried, Then the selection is preserved and the new list is available`, async () => {
    // Given
    await openProvider("DeepSeek")
    await fill("#apiKey", "test-key")
    await fill("#baseURL", baseURL)
    const savedModel = await modelValue()
    responseMode = failure

    // When
    await clickButton(page, "Fetch available models")
    await waitForText(page, "Click to retry")
    await capture(page, `models-${failure}`)
    assert.equal(await modelValue(), savedModel)
    responseMode = "models"
    await clickButton(page, "Click to retry")

    // Then
    await waitForText(page, "future-chat-model")
    assert.equal(await modelValue(), savedModel)
  })
}

it("user uses a local provider without a key: Given an unauthenticated endpoint, When it returns no models, Then the user can still enter and save a model manually", async () => {
  // Given
  await openProvider("Custom Provider")
  await fill("#baseURL", baseURL)
  expectedAuthorization = undefined
  models = []

  // When
  await clickButton(page, "Fetch available models")
  await waitForText(page, "No models available")
  await capture(page, "models-empty")
  await fill(MODEL_INPUT, "local-model")
  await page.keyboard.press("Tab")
  await reloadSettings()

  // Then
  await openProvider("Custom Provider")
  assert.equal(await modelValue(), "local-model")
})

it("user authenticates with custom headers: Given a provider with a key and header overrides, When models are fetched, Then the endpoint accepts the custom authorization and tenant", async () => {
  // Given
  await openProvider("DeepSeek")
  await fill("#apiKey", "unused-key")
  await fill("#baseURL", baseURL)
  await clickButton(page, "Advanced: temperature, headers, provider options")
  await fill("[aria-label='provider-headers-editor'] .cm-content", JSON.stringify({ "authorization": "Bearer custom-key", "X-Tenant": "reading", "X-Empty": "" }))
  await page.keyboard.press("Tab")
  await page.evaluate(() => new Promise((resolve) => {
    const check = async () => {
      const saved = Object.values(await chrome.storage.local.get()).some(value => value?.providersConfig?.some(p => p.headers?.authorization === "Bearer custom-key"))
      if (saved) {
        chrome.storage.onChanged.removeListener(check)
        resolve(true)
      }
    }
    chrome.storage.onChanged.addListener(check)
    check()
  }))
  expectedAuthorization = "Bearer custom-key"
  expectedTenant = "reading"

  // When
  await clickButton(page, "Fetch available models")

  // Then
  await waitForText(page, "future-chat-model")
  await selectModel("future-chat-model")
  assert.equal(await modelValue(), "future-chat-model")
})

it("user switches providers during a request: Given an unfinished old request, When another provider is opened, Then only that provider's models are offered", { timeout: 30000 }, async () => {
  // Given
  await openProvider("DeepSeek")
  await fill("#apiKey", "test-key")
  await fill("#baseURL", baseURL)
  const pending = Promise.withResolvers()
  pendingRequest = pending.resolve
  models = ["old-provider-model"]
  await clickButton(page, "Fetch available models")
  const release = await pending.promise
  await page.getByRole("button", { name: "Fetch available models", exact: true, disabled: true }).waitFor()
  await capture(page, "models-loading")

  // When
  await openProvider("OpenAI")
  await fill("#apiKey", "test-key")
  await fill("#baseURL", baseURL.replace("/v1", "/other"))
  models = ["new-provider-model"]
  await clickButton(page, "Fetch available models")
  await waitForText(page, "new-provider-model")
  release()
  await page.waitForFunction(url => performance.getEntriesByType("resource").some(entry => entry.name === url), `${baseURL}/models`)

  // Then
  assert.equal(await page.getByRole("option").textContent(), "new-provider-model")
  await selectModel("new-provider-model")
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
  await page.keyboard.press("Tab")
  // Each key press queues one write; reload after the last one is stored.
  await waitForSavedProvider({ apiKey: "test-key", baseURL, model: "manually-entered-model", name: "My provider" })
  await reloadSettings()

  // Then
  await openProvider("My provider")
  assert.equal(await page.locator("#baseURL").inputValue(), baseURL)
  assert.equal(await modelValue(), "manually-entered-model")
  await clickButton(page, "Fetch available models")
  await waitForText(page, "future-chat-model")
})

it("user edits settings in two tabs: Given a provider open in both tabs, When the other tab renames it, Then returning to the first tab preserves both edits", async () => {
  // Given
  const first = page
  await openProvider("DeepSeek")
  await fill("#baseURL", baseURL)
  const second = await context.newPage()
  page = second
  await page.goto(optionsURL)
  await waitForText(page, "DeepSeek")
  await openProvider("DeepSeek")
  await page.waitForFunction(url => document.querySelector("#baseURL")?.value === url, baseURL)

  // When
  await fill("#name", "Edited in another tab")
  await page.keyboard.press("Tab")
  page = first
  await page.bringToFront()

  // Then
  await page.waitForFunction(() => document.querySelector("#name")?.value === "Edited in another tab")
  assert.equal(await page.locator("#baseURL").inputValue(), baseURL)
  await fill(MODEL_INPUT, "shared-model")
  page = second
  await page.bringToFront()
  await page.waitForFunction(selector => document.querySelector(selector)?.value === "shared-model", MODEL_INPUT)
  assert.equal(await page.locator("#name").inputValue(), "Edited in another tab")
})

it("user stages recommendations in an invalid form: Given a duplicate provider name, When recommendations are applied and the name is corrected, Then the settings survive reloading", async () => {
  // Given
  await openProvider("OpenAI")
  await fill("#name", "DeepSeek")
  await waitForText(page, "Another service is already named")

  // When
  await clickButton(page, "View recommended provider options")
  await waitForText(page, "Recommended provider options detected")
  await clickButton(page, "Apply")
  assert.equal(await page.locator("#name").inputValue(), "DeepSeek")
  await waitForText(page, "Another service is already named")
  await clickButton(page, "View recommended provider options")
  await waitForText(page, "Applied")
  await page.keyboard.press("Escape")
  await fill("#name", "OpenAI Saved")
  await reloadSettings()

  // Then
  await openProvider("OpenAI Saved")
  await clickButton(page, "View recommended provider options")
  await waitForText(page, "Applied")
  assert.match(await page.getByRole("dialog").textContent(), /minimal/)
})

for (const providerName of ["DeepSeek", "Custom Provider"]) {
  it(`user tests a base URL that ends with slashes for ${providerName}: Given models fetched from that URL, When the connection is tested, Then the translation request reaches the same API`, async () => {
    // Given
    await openProvider(providerName)
    await fill("#apiKey", "test-key")
    await fill("#baseURL", `${baseURL}//`)
    await clickButton(page, "Fetch available models")
    await waitForText(page, "future-chat-model")
    await selectModel("future-chat-model")

    // When
    await clickButton(page, "Test connection")

    // Then
    await page.locator(".tabler-icon-check, .tabler-icon-x").waitFor()
    assert.ok(await page.locator(".tabler-icon-check").count() > 0)
  })
}

it("user clears the model: Given a provider with a model, When the model field is cleared, Then an error shows and the saved model stays", async () => {
  // Given
  await openProvider("DeepSeek")
  const savedModel = await modelValue()

  // When
  await typeInto(MODEL_INPUT, "")
  await page.keyboard.press("Tab")

  // Then
  await waitForText(page, "Enter a model ID.")
  await reloadSettings()
  await openProvider("DeepSeek")
  assert.equal(await modelValue(), savedModel)
})

it("user tests a connection with a config from an older version: Given the stored provider still uses the old model fields, When the connection is tested, Then the translation request succeeds", async () => {
  // Given: storage that the background has not converted yet.
  await page.evaluate(async (url) => {
    const { config } = await chrome.storage.local.get("config")
    const provider = config.providersConfig.find(p => p.provider === "deepseek")
    provider.apiKey = "test-key"
    provider.baseURL = url
    provider.model = { model: "deepseek-chat", isCustomModel: true, customModel: "future-chat-model" }
    await chrome.storage.local.set({ config })
  }, baseURL)
  await reloadSettings()
  await openProvider("DeepSeek")
  assert.equal(await modelValue(), "future-chat-model")

  // When
  await clickButton(page, "Test connection")

  // Then
  await page.locator(".tabler-icon-check, .tabler-icon-x").waitFor()
  assert.ok(await page.locator(".tabler-icon-check").count() > 0)
})
