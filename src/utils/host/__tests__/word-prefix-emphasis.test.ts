// @vitest-environment jsdom
import { act, createElement } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, expect, it } from "vitest"
import { startWordPrefixEmphasis, withoutWordPrefixEmphasis } from "../word-prefix-emphasis"

let stop = () => {}
afterEach(() => {
  stop()
  document.body.replaceChildren()
})

it("user reads unchanged text: Given Latin words and other scripts, When emphasis is enabled, Then only Latin word prefixes are bold and graphemes stay intact", () => {
  const text = "A cat reads quietly. naïve e\u0301lan don't 中文 日本語 한국어 العربية 👩‍💻 <script> & 123"
  document.body.innerHTML = "<p></p>"
  const paragraph = document.querySelector("p")!
  paragraph.textContent = text
  stop = startWordPrefixEmphasis(document)
  expect(paragraph.textContent).toBe(text)
  expect([...paragraph.querySelectorAll("[data-vibe-reading-prefix]")].map(node => node.textContent))
    .toEqual(["ca", "rea", "quie", "naï", "e\u0301l", "don", "scr"])
  expect(paragraph.querySelector("script")).toBeNull()
  stop()
  expect(paragraph.innerHTML).toBe("A cat reads quietly. naïve élan don't 中文 日本語 한국어 العربية 👩‍💻 &lt;script&gt; &amp; 123")
})

it("user keeps page controls intact: Given code, editors and existing emphasis, When enabled, Then those regions and link actions are preserved", () => {
  document.body.innerHTML = `<p>Reading <a href="#target">linked text</a>.</p>
    <pre>sample code</pre><code>inline code</code><kbd>keyboard shortcut</kbd>
    <div contenteditable="true"><p>editable text</p></div>
    <div role="textbox">textbox text</div><button>button text</button>
    <select><option>option text</option></select><textarea>input text</textarea>
    <strong>important text</strong><svg><text>vector text</text></svg>
    <div hidden>hidden text</div><div inert>inert text</div>`
  const link = document.querySelector("a")!
  let clicked = false
  link.addEventListener("click", () => {
    clicked = true
  })
  stop = startWordPrefixEmphasis(document)
  expect(document.querySelectorAll("[data-vibe-reading-prefix]")).toHaveLength(3)
  expect(document.querySelector("a")).toBe(link)
  link.click()
  expect(clicked).toBe(true)
  stop()
  expect(document.querySelector("a")).toBe(link)
  expect(document.querySelectorAll("[data-vibe-reading-prefix]")).toHaveLength(0)
})

it("user reads live updates: Given an enabled page, When text is inserted or changed, Then new text is emphasized once and stopping preserves updates", async () => {
  document.body.innerHTML = "<p>Original sentence.</p>"
  stop = startWordPrefixEmphasis(document)
  const paragraph = document.querySelector("p")!
  paragraph.textContent = "Updated passage."
  const extra = document.createElement("p")
  extra.textContent = "Another paragraph."
  document.body.append(extra)
  // Flush the real MutationObserver delivery, without replacing browser APIs.
  await new Promise<void>(resolve => queueMicrotask(resolve))
  expect([...paragraph.querySelectorAll("[data-vibe-reading-prefix]")].map(node => node.textContent)).toEqual(["Upda", "pass"])
  expect(extra.querySelectorAll("[data-vibe-reading-prefix]")).toHaveLength(2)
  const prefix = paragraph.querySelector("[data-vibe-reading-prefix]")!
  prefix.firstChild!.textContent = "Revised"
  await new Promise<void>(resolve => queueMicrotask(resolve))
  expect(paragraph.textContent).toBe("Revisedted passage.")
  expect(paragraph.querySelector("[data-vibe-reading-prefix] [data-vibe-reading-prefix]")).toBeNull()
  stop()
  expect(paragraph.textContent).toBe("Revisedted passage.")
  expect(extra.innerHTML).toBe("Another paragraph.")
  paragraph.textContent = "Stopped updates."
  await new Promise<void>(resolve => queueMicrotask(resolve))
  expect(paragraph.children).toHaveLength(0)
})

it("user translates original markup: Given emphasized text, When translation takes a snapshot, Then it receives original markup without mutating the visible page", () => {
  document.body.innerHTML = "<p>Hello <a href=\"#link\">wonderful world</a>.</p>"
  const paragraph = document.querySelector("p")!
  const original = paragraph.innerHTML
  stop = startWordPrefixEmphasis(document)
  expect(withoutWordPrefixEmphasis(paragraph).innerHTML).toBe(original)
  expect(paragraph.querySelectorAll("[data-vibe-reading-prefix]").length).toBeGreaterThan(0)
})

it("user reads framework updates: Given a React page, When text changes or disappears during emphasis and after stopping, Then the visible page follows React", async () => {
  const container = document.createElement("div")
  document.body.append(container)
  const root = createRoot(container)
  const render = (word: string | null) => act(() => root.render(createElement("p", null, "Status: ", word, createElement("a", { href: "#end" }, "details"))))
  try {
    render("Original")
    stop = startWordPrefixEmphasis(document)
    render("Updated")
    await new Promise<void>(resolve => queueMicrotask(resolve))
    expect(container.textContent).toBe("Status: Updateddetails")
    render(null)
    await new Promise<void>(resolve => queueMicrotask(resolve))
    expect(container.textContent).toBe("Status: details")
    render("Returned")
    await new Promise<void>(resolve => queueMicrotask(resolve))
    render("Pending")
    stop()
    expect(container.textContent).toBe("Status: Pendingdetails")
    render("Final")
    expect(container.textContent).toBe("Status: Finaldetails")
    expect(container.querySelector("[data-vibe-reading-prefix]")).toBeNull()
  }
  finally {
    stop()
    act(() => root.unmount())
  }
})

it("user reads inserted content: Given active emphasis, When code and normal paragraphs are inserted, Then only the normal paragraph is emphasized", async () => {
  stop = startWordPrefixEmphasis(document)
  const code = document.createElement("pre")
  code.innerHTML = "<span>Keep code unchanged.</span>"
  const paragraph = document.createElement("p")
  paragraph.textContent = "Fresh content."
  document.body.append(code, paragraph)
  await new Promise<void>(resolve => queueMicrotask(resolve))
  expect(code.innerHTML).toBe("<span>Keep code unchanged.</span>")
  expect(paragraph.querySelector("[data-vibe-reading-prefix]")?.textContent).toBe("Fre")
})
