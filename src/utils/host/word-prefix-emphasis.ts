import { REACT_SHADOW_HOST_CLASS, TRANSLATION_ERROR_CONTAINER_CLASS } from "@/utils/constants/dom-labels"
import { isElement, isTextNode } from "./dom/filter"

// Custom elements are inline, and page rules for span, b or strong do not match them.
const TEXT_TAG = "plainly-prefix-text"
const PREFIX_TAG = "plainly-prefix"
const OWNED_SELECTOR = `${TEXT_TAG}, ${PREFIX_TAG}`
const EXCLUDED_SELECTOR = [
  "script", "style", "noscript", "template", "svg", "math",
  "pre", "code", "kbd", "samp", "input", "textarea", "select", "button",
  "[contenteditable]", "[role=textbox]", "[role=button]", "[hidden]", "[inert]", "[aria-hidden=true]",
  "b", "strong", "h1", "h2", "h3", "h4", "h5", "h6",
  `.${REACT_SHADOW_HOST_CLASS}`, `.${TRANSLATION_ERROR_CONTAINER_CLASS}`,
].join(",")
const SKIPPED_SELECTOR = `${EXCLUDED_SELECTOR},${OWNED_SELECTOR}`
// A word starts with a letter: a leading combining mark belongs to the previous text node.
const LATIN_WORD = /^\p{Script=Latin}[\p{Script=Latin}\p{M}]*(?:['’][\p{Script=Latin}\p{M}]+)*$/u
const TEXT_PARTS = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*|[^\p{L}\p{M}\p{N}]+/gu
const LETTERS = /\P{M}\p{M}*/gu
const HAS_LATIN = /\p{Script=Latin}/u

function unwrap(root: ParentNode) {
  for (const element of [...root.querySelectorAll(OWNED_SELECTOR)].reverse()) {
    element.normalize()
    element.replaceWith(...element.childNodes)
  }
}

export function isWordPrefixEmphasisElement(node: Node): boolean {
  return isElement(node) && node.matches(OWNED_SELECTOR)
}

// Translation requests and restoration snapshots must not retain presentation markup.
export function withoutWordPrefixEmphasis(element: Element): Element {
  if (!element.querySelector(OWNED_SELECTOR))
    return element
  const clone = element.cloneNode(true) as Element
  unwrap(clone)
  return clone
}

function createOwnedElement(doc: Document, tag: string): HTMLElement {
  const element = doc.createElement(tag)
  // Inline !important declarations win over every page rule, including `*` and `:last-child`.
  element.style.setProperty("all", "unset", "important")
  return element
}

export function startWordPrefixEmphasis(doc: Document): () => void {
  // SVG and XML documents have no body to emphasize.
  const body = doc.body
  if (!body)
    return () => {}
  const originals = new Map<Text, HTMLElement>()

  function emphasize(text: Text) {
    // Most page text nodes are whitespace or non-Latin; skip them before building markup.
    if (!HAS_LATIN.test(text.data))
      return
    const wrapper = createOwnedElement(doc, TEXT_TAG)
    for (const [segment] of text.data.matchAll(TEXT_PARTS)) {
      // Latin base letters and their combining marks stay together, including on Firefox 112.
      const letters = LATIN_WORD.test(segment) ? [...segment.matchAll(LETTERS)].map(part => part[0]) : []
      if (letters.length < 2) {
        wrapper.append(segment)
        continue
      }
      // Half the graphemes, rounded up, is a presentation choice, not a proven optimum.
      const length = Math.ceil(letters.length / 2)
      const prefix = createOwnedElement(doc, PREFIX_TAG)
      prefix.style.setProperty("font-weight", "700", "important")
      prefix.textContent = letters.slice(0, length).join("")
      wrapper.append(prefix, letters.slice(length).join(""))
    }
    // Only prefixes are appended as elements; plain text is appended as strings.
    if (wrapper.firstElementChild) {
      // Keep framework-owned nodes in their original parent so updates and removals still work.
      text.after(wrapper)
      text.data = ""
      originals.set(text, wrapper)
    }
  }

  function restore(text: Text, wrapper: HTMLElement, changedTexts: Set<Node>) {
    if (!changedTexts.has(text))
      text.data = wrapper.textContent ?? ""
    wrapper.remove()
  }

  function visit(root: Node) {
    // The walker rejects skipped subtrees, so ancestors only need checking once per root.
    const element = isElement(root) ? root : root.parentElement
    if (!root.isConnected || !element || element.closest(SKIPPED_SELECTOR))
      return
    if (isTextNode(root)) {
      emphasize(root)
      return
    }
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (isElement(node))
          return node.matches(SKIPPED_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP
        return NodeFilter.FILTER_ACCEPT
      },
    })
    const texts: Text[] = []
    while (walker.nextNode())
      texts.push(walker.currentNode as Text)
    texts.forEach(emphasize)
  }

  const observer = new MutationObserver((records) => {
    // Disconnect only for our synchronous writes; page mutations remain observable.
    observer.disconnect()
    const roots = new Set<Node>()
    const changedTexts = new Set(records.filter(record => record.type === "characterData").map(record => record.target))
    const changedWrappers = new Set<Element>()
    for (const record of records) {
      const element = isElement(record.target) ? record.target : record.target.parentElement
      const wrapper = element?.closest(TEXT_TAG)
      if (wrapper) {
        changedWrappers.add(wrapper)
      }
      else if (record.type === "characterData") {
        roots.add(record.target)
      }
      else {
        record.addedNodes.forEach(node => roots.add(node))
      }
    }
    for (const [text, wrapper] of originals) {
      if (!text.isConnected && wrapper.isConnected && changedWrappers.has(wrapper)) {
        // The page merged its text into the wrapper, for example with normalize(). Keep that text in place.
        const merged = doc.createTextNode(wrapper.textContent ?? "")
        wrapper.replaceWith(merged)
        originals.delete(text)
        roots.add(merged)
      }
      else if (changedTexts.has(text) || changedWrappers.has(wrapper) || !text.isConnected || text.nextSibling !== wrapper) {
        restore(text, wrapper, changedTexts)
        originals.delete(text)
        roots.add(text)
      }
    }
    roots.forEach(visit)
    observe()
  })
  function observe() {
    observer.observe(body, { childList: true, subtree: true, characterData: true })
  }
  visit(body)
  observe()
  return () => {
    const pendingUpdates = new Set(observer.takeRecords().filter(record => record.type === "characterData").map(record => record.target))
    observer.disconnect()
    originals.forEach((wrapper, text) => restore(text, wrapper, pendingUpdates))
    originals.clear()
    // The page may have copied emphasized markup into nodes that are not tracked.
    unwrap(body)
  }
}
