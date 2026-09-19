import { REACT_SHADOW_HOST_CLASS, TRANSLATION_ERROR_CONTAINER_CLASS } from "@/utils/constants/dom-labels"

export const WORD_PREFIX_TEXT_ATTRIBUTE = "data-vibe-reading-prefix-text"
const PREFIX_ATTRIBUTE = "data-vibe-reading-prefix"
const OWNED_SELECTOR = `[${WORD_PREFIX_TEXT_ATTRIBUTE}], [${PREFIX_ATTRIBUTE}]`
const EXCLUDED_SELECTOR = [
  "script", "style", "noscript", "template", "svg", "math",
  "pre", "code", "kbd", "samp", "input", "textarea", "select", "button",
  "[contenteditable]", "[role=textbox]", "[role=button]", "[hidden]", "[inert]", "[aria-hidden=true]",
  "b", "strong", "h1", "h2", "h3", "h4", "h5", "h6",
  `.${REACT_SHADOW_HOST_CLASS}`, `.${TRANSLATION_ERROR_CONTAINER_CLASS}`,
].join(",")
const LATIN_WORD = /^[\p{Script=Latin}\p{M}]+(?:['’][\p{Script=Latin}\p{M}]+)*$/u
const TEXT_PARTS = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*|[^\p{L}\p{M}\p{N}]+/gu

function unwrap(root: ParentNode) {
  for (const element of [...root.querySelectorAll(OWNED_SELECTOR)].reverse()) {
    element.normalize()
    element.replaceWith(...element.childNodes)
  }
}

// Translation requests and restoration snapshots must not retain presentation markup.
export function withoutWordPrefixEmphasis(element: Element): Element {
  if (!element.matches(OWNED_SELECTOR) && !element.querySelector(OWNED_SELECTOR))
    return element
  const clone = element.cloneNode(true) as Element
  unwrap(clone)
  if (clone.hasAttribute(PREFIX_ATTRIBUTE))
    clone.removeAttribute("style")
  clone.removeAttribute(WORD_PREFIX_TEXT_ATTRIBUTE)
  clone.removeAttribute(PREFIX_ATTRIBUTE)
  return clone
}

export function startWordPrefixEmphasis(doc: Document): () => void {
  const originals = new Map<Text, HTMLElement>()

  function emphasize(text: Text) {
    if (!text.isConnected || !text.parentElement || text.parentElement.closest(`${EXCLUDED_SELECTOR},${OWNED_SELECTOR}`))
      return
    const wrapper = doc.createElement("span")
    wrapper.setAttribute(WORD_PREFIX_TEXT_ATTRIBUTE, "")
    let hasPrefix = false
    for (const [segment] of text.data.matchAll(TEXT_PARTS)) {
      if (!LATIN_WORD.test(segment)) {
        wrapper.append(segment)
        continue
      }
      // Latin base letters and their combining marks stay together, including on Firefox 112.
      const letters = [...segment.matchAll(/\P{M}\p{M}*/gu)].map(part => part[0])
      if (letters.length < 2) {
        wrapper.append(segment)
        continue
      }
      // Half the graphemes, rounded up, is a presentation choice, not a proven optimum.
      const length = Math.ceil(letters.length / 2)
      const prefix = doc.createElement("span")
      prefix.setAttribute(PREFIX_ATTRIBUTE, "")
      prefix.style.fontWeight = "700"
      prefix.textContent = letters.slice(0, length).join("")
      wrapper.append(prefix, letters.slice(length).join(""))
      hasPrefix = true
    }
    if (hasPrefix) {
      // Keep framework-owned nodes in their original parent so updates and removals still work.
      text.after(wrapper)
      text.data = ""
      originals.set(text, wrapper)
    }
  }

  function visit(root: Node) {
    if (!root.isConnected)
      return
    if (root.nodeType === Node.TEXT_NODE) {
      emphasize(root as Text)
      return
    }
    if (root.nodeType === Node.ELEMENT_NODE && (root as Element).matches(`${EXCLUDED_SELECTOR},${OWNED_SELECTOR}`))
      return
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === Node.ELEMENT_NODE)
          return (node as Element).matches(`${EXCLUDED_SELECTOR},${OWNED_SELECTOR}`) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP
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
      const element = record.target.nodeType === Node.ELEMENT_NODE ? record.target as Element : record.target.parentElement
      const wrapper = element?.closest(`[${WORD_PREFIX_TEXT_ATTRIBUTE}]`)
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
      if (changedTexts.has(text) || changedWrappers.has(wrapper) || !text.isConnected || text.nextSibling !== wrapper) {
        if (!changedTexts.has(text))
          text.data = wrapper.textContent ?? ""
        wrapper.remove()
        originals.delete(text)
        roots.add(text)
      }
    }
    roots.forEach(visit)
    observe()
  })
  function observe() {
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true })
  }
  visit(doc.body)
  observe()
  return () => {
    const pendingUpdates = new Set(observer.takeRecords().filter(record => record.type === "characterData").map(record => record.target))
    observer.disconnect()
    for (const [text, wrapper] of originals) {
      if (!pendingUpdates.has(text))
        text.data = wrapper.textContent ?? ""
      wrapper.remove()
    }
    originals.clear()
  }
}
