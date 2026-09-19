import assert from "node:assert/strict"
import { Buffer } from "node:buffer"
import { execFile } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile } from "node:fs/promises"
import { createServer } from "node:http"
import { resolve } from "node:path"
import process from "node:process"
import { after, afterEach, before, beforeEach, it } from "node:test"
import { promisify } from "node:util"

const exec = promisify(execFile)
const extension = resolve(".output/chrome-mv3")
let scenario = 0
let session
let optionsURL
let baseURL
let models = ["future-chat-model", "another-chat-model"]
let expectedAuthorization = "Bearer test-key"
let expectedTenant
let responseMode = "models"
let pendingRequest

// Wire contract checked against the provider documentation, not application code:
// https://developers.openai.com/api/reference/resources/models/methods/list
// https://api-docs.deepseek.com/api/list-models
// https://lmstudio.ai/docs/developer/openai-compat/models
const server = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json")
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

async function browser(...args) {
  const { stdout } = await exec("agent-browser", [
    "--session", session,
    "--extension", extension,
    "--args", "--headless=new,--force-device-scale-factor=2,--lang=en-US",
    "--json", ...args,
  ], { timeout: 30000, env: { ...process.env, AGENT_BROWSER_DEFAULT_TIMEOUT: "10000" } })
  const result = JSON.parse(stdout)
  assert.equal(result.success, true, result.error)
  return result.data
}

async function clickButton(name) {
  await browser("find", "role", "button", "click", "--name", name, "--exact")
}

async function capture(name) {
  if (process.env.E2E_SCREENSHOTS) {
    await mkdir(process.env.E2E_SCREENSHOTS, { recursive: true })
    await browser("screenshot", resolve(process.env.E2E_SCREENSHOTS, `${name}.png`))
  }
}

before(async () => {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  baseURL = `http://127.0.0.1:${server.address().port}/v1`
  const manifest = JSON.parse(await readFile(`${extension}/manifest.json`, "utf8"))
  const id = createHash("sha256").update(Buffer.from(manifest.key, "base64")).digest("hex").slice(0, 32).replace(/[0-9a-f]/g, char => String.fromCharCode(97 + Number.parseInt(char, 16)))
  optionsURL = `chrome-extension://${id}/options.html#/api-providers`
})

beforeEach(async () => {
  session = `models-${process.pid}-${++scenario}`
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

for (const providerName of ["1 features OpenAI OpenAI", "DeepSeek DeepSeek", "Custom Provider Custom Provider"]) {
  it(`user selects a discovered model for ${providerName}: Given a configured provider, When a new model is selected, Then it survives reloading settings`, async () => {
  // Given
    await clickButton(providerName)
    await browser("fill", "#apiKey", "test-key")
    await browser("fill", "#baseURL", baseURL)

    // When
    await clickButton("Fetch available models")
    await browser("wait", "--text", "future-chat-model")
    await capture(providerName.startsWith("DeepSeek") ? "models-open" : providerName.startsWith("1") ? "openai-models" : "compatible-models")
    await browser("find", "role", "option", "click", "--name", "future-chat-model", "--exact")

    // Then
    assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, "future-chat-model")
    await browser("reload")
    await browser("wait", "--text", "DeepSeek")
    await clickButton(providerName)
    assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, "future-chat-model")
  })
}

it("user refreshes available models: Given a saved model, When the provider changes its list, Then new models can be searched without changing the saved selection", async () => {
  // Given
  await clickButton("DeepSeek DeepSeek")
  await browser("fill", "#apiKey", "test-key")
  await browser("fill", "#baseURL", `${baseURL}///`)
  const savedModel = (await browser("get", "value", "input[aria-label='Model']")).value
  await clickButton("Fetch available models")
  await browser("wait", "--text", "future-chat-model")
  await browser("press", "Escape")

  // When
  models = ["new-model", "another-model"]
  await clickButton("Fetch available models")
  await browser("wait", "--text", "new-model")
  await browser("find", "placeholder", "Search models...", "fill", "new-")

  // Then
  await browser("wait", "--fn", "document.querySelectorAll('[role=option]').length === 1")
  assert.equal((await browser("get", "text", "[role=option]")).text, "new-model")
  assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, savedModel)
})

for (const failure of ["error", "malformed"]) {
  it(`user recovers from ${failure}: Given a saved model, When fetching fails and is retried, Then the selection is preserved and the new list is available`, async () => {
    // Given
    await clickButton("DeepSeek DeepSeek")
    await browser("fill", "#apiKey", "test-key")
    await browser("fill", "#baseURL", baseURL)
    const savedModel = (await browser("get", "value", "input[aria-label='Model']")).value
    responseMode = failure

    // When
    await clickButton("Fetch available models")
    await browser("wait", "--text", "Click to retry")
    await capture(`models-${failure}`)
    assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, savedModel)
    responseMode = "models"
    await clickButton("Click to retry")

    // Then
    await browser("wait", "--text", "future-chat-model")
    assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, savedModel)
  })
}

it("user uses a local provider without a key: Given an unauthenticated endpoint, When it returns no models, Then the user can still enter and save a model manually", async () => {
  // Given
  await clickButton("Custom Provider Custom Provider")
  await browser("fill", "#baseURL", baseURL)
  expectedAuthorization = undefined
  models = []

  // When
  await clickButton("Fetch available models")
  await browser("wait", "--text", "No models available")
  await capture("models-empty")
  await browser("fill", "input[aria-label='Model']", "local-model")
  await browser("press", "Tab")
  await browser("reload")

  // Then
  await browser("wait", "--text", "DeepSeek")
  await clickButton("Custom Provider Custom Provider")
  assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, "local-model")
})

it("user authenticates with custom headers: Given a provider with a key and header overrides, When models are fetched, Then the endpoint accepts the custom authorization and tenant", async () => {
  // Given
  await clickButton("DeepSeek DeepSeek")
  await browser("fill", "#apiKey", "unused-key")
  await browser("fill", "#baseURL", baseURL)
  await clickButton("Advanced Options")
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
  await clickButton("Fetch available models")

  // Then
  await browser("wait", "--text", "future-chat-model")
  await browser("find", "role", "option", "click", "--name", "future-chat-model", "--exact")
  assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, "future-chat-model")
})

it("user switches providers during a request: Given an unfinished old request, When another provider is selected, Then only that provider's models are offered", { timeout: 30000 }, async () => {
  // Given
  await clickButton("DeepSeek DeepSeek")
  await browser("fill", "#apiKey", "test-key")
  await browser("fill", "#baseURL", baseURL)
  const pending = Promise.withResolvers()
  pendingRequest = pending.resolve
  models = ["old-provider-model"]
  await clickButton("Fetch available models")
  const release = await pending.promise
  await browser("wait", "--fn", "[...document.querySelectorAll('button')].some(b => b.textContent.includes('Fetch available models') && b.disabled)")
  await capture("models-loading")

  // When
  await clickButton("1 features OpenAI OpenAI")
  await browser("fill", "#apiKey", "test-key")
  await browser("fill", "#baseURL", baseURL.replace("/v1", "/other"))
  models = ["new-provider-model"]
  await clickButton("Fetch available models")
  await browser("wait", "--text", "new-provider-model")
  release()
  await browser("wait", "--fn", `performance.getEntriesByType('resource').some(e => e.name === '${baseURL}/models')`)

  // Then
  assert.equal((await browser("get", "text", "[role=option]")).text, "new-provider-model")
  await browser("find", "role", "option", "click", "--name", "new-provider-model", "--exact")
  await browser("reload")
  await browser("wait", "--text", "DeepSeek")
  assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, "new-provider-model")
})

it("user saves rapid edits: Given a provider, When connection and model fields are edited consecutively, Then none revert after reloading", async () => {
  // Given
  await clickButton("DeepSeek DeepSeek")

  // When
  await browser("fill", "#apiKey", "test-key")
  await browser("fill", "#baseURL", baseURL)
  await browser("fill", "input[aria-label='Model']", "manually-entered-model")
  await browser("fill", "#description", "My provider")
  await browser("press", "Tab")
  await browser("reload")

  // Then
  await browser("wait", "--text", "DeepSeek")
  await clickButton("DeepSeek DeepSeek")
  assert.equal((await browser("get", "value", "#baseURL")).value, baseURL)
  assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, "manually-entered-model")
  assert.equal((await browser("get", "value", "#description")).value, "My provider")
  await clickButton("Fetch available models")
  await browser("wait", "--text", "future-chat-model")
})

it("user stages recommendations in an invalid form: Given a duplicate provider name, When recommendations are applied and the name is corrected, Then the settings survive reloading", async () => {
  // Given
  await browser("fill", "#name", "DeepSeek")
  await browser("wait", "--text", "Duplicate provider name")

  // When
  await clickButton("View recommended provider options")
  await browser("wait", "--text", "Recommended provider options detected")
  await clickButton("Apply")
  assert.equal((await browser("get", "value", "#name")).value, "DeepSeek")
  await browser("wait", "--text", "Duplicate provider name")
  await clickButton("View recommended provider options")
  await browser("wait", "--text", "Applied")
  await browser("press", "Escape")
  await browser("fill", "#name", "OpenAI Saved")
  await browser("reload")

  // Then
  await browser("wait", "--text", "OpenAI Saved")
  assert.equal((await browser("get", "value", "#name")).value, "OpenAI Saved")
  await clickButton("View recommended provider options")
  await browser("wait", "--text", "Applied")
  assert.match((await browser("get", "text", "[role=dialog]")).text, /minimal/)
})

it("user edits settings in two tabs: Given a saved provider in both tabs, When the other tab changes its description, Then returning to the first tab preserves both edits", async () => {
  // Given
  await clickButton("DeepSeek DeepSeek")
  await browser("fill", "#baseURL", baseURL)
  await browser("tab", "new", optionsURL)
  await browser("wait", "--text", "DeepSeek")
  await clickButton("DeepSeek DeepSeek")
  await browser("wait", "--fn", `document.querySelector('#baseURL')?.value === '${baseURL}'`)

  // When
  await browser("fill", "#description", "Edited in another tab")
  await browser("press", "Tab")
  await browser("tab", "t1")

  // Then
  await browser("wait", "--fn", "document.querySelector('#description')?.value === 'Edited in another tab'")
  assert.equal((await browser("get", "value", "#baseURL")).value, baseURL)
  await browser("fill", "input[aria-label='Model']", "shared-model")
  await browser("tab", "t2")
  await browser("wait", "--fn", "document.querySelector('input[aria-label=Model]')?.value === 'shared-model'")
  assert.equal((await browser("get", "value", "#description")).value, "Edited in another tab")
})

it("user applies recommendations to a valid form: Given an unchanged legacy model, When recommendations are applied, Then the saved settings retain them", async () => {
  // Given
  assert.equal((await browser("get", "value", "input[aria-label='Model']")).value, "gpt-5-mini")

  // When
  await browser("focus", "button[aria-label='View recommended provider options']")
  await browser("press", "Enter")
  await browser("wait", "--text", "Recommended provider options detected")
  await clickButton("Apply")
  await browser("reload")

  // Then
  await browser("wait", "--text", "DeepSeek")
  await clickButton("View recommended provider options")
  await browser("wait", "--text", "Applied")
  assert.match((await browser("get", "text", "[role=dialog]")).text, /minimal/)
})
