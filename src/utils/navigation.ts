import { browser } from "#imports"

export interface OpenOptionsPageOptions {
  /** Section id on the settings page to scroll to, e.g. "providers". */
  section?: string
}

export async function openOptionsPage(options?: OpenOptionsPageOptions) {
  const hash = options?.section ? `#${options.section}` : ""

  await browser.tabs.create({
    active: true,
    url: browser.runtime.getURL(`/options.html${hash}`),
  })
}
