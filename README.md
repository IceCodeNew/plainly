# Vibe Reading

Vibe Reading is a browser extension for reading and translating web pages with
local configuration and user-provided AI or translation providers.

This fork is intentionally narrow: **reading only**. It keeps the full-page
reading and translation workflow, removes the product-suite features around it,
and does not depend on a project-hosted backend. Features that need a network
service, such as AI translation, use the provider endpoints and API keys
configured by the user.

## Features

- 📖 Reading-first full-page translation.
- Full-page translation with bilingual and translation-only display modes.
- Paragraph and page-title translation for content-heavy pages.
- LLM-based language detection for auto-translate and skip-language rules.
- Context-aware AI translation using page content and summaries.
- Configurable AI and translation providers, including local or self-hosted
  provider endpoints.
- Custom prompts, translation styles, page rules, and batch/rate controls.
- No Notebase, hosted account, config backup, telemetry dashboard, or project
  backend dependency.

## Word-prefix emphasis

Enable **Word-prefix emphasis** in the extension popup to bold the beginning of
Latin-script words on accessible web pages. It is off by default, preserves case
and text, and skips code and editable fields. Disable it to remove the formatting.

This is a visual preference, not an established speed-reading aid.
[A controlled study](https://link.springer.com/article/10.3758/s13414-025-03067-w)
found slower reading without better comprehension;
[an eye-tracking study](https://pmc.ncbi.nlm.nih.gov/articles/PMC12565662/)
found no reading-speed benefit. Neither establishes an optimal bolded proportion.
The implementation was compared with
[Jiffy Reader](https://github.com/ansh/jiffyreader-public-archive), with independent
DOM construction and full removal of owned markup when disabled.

## Proudly Missing

Vibe Reading is smaller on purpose. Compared with the upstream Read Frog project,
Immersive Translate-style translation suites, browser built-in translators, and
general AI sidebar tools, this fork proudly avoids features that distract from
reading.

| Product or category                              | What they often include                         | What Vibe Reading proudly does not include                   | What Vibe Reading keeps                  |
| ------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------- |
| 🐸 Upstream Read Frog                            | Learning tools, hosted integrations, more modes | Notebase, hosted storage, Custom AI Actions, Beta Experience | Focused page reading and translation     |
| 🌊 Immersive Translate-style translation suites  | Broad translation surfaces across many media    | Video subtitles, input translation, overlay tools, TTS       | Web page reading translation             |
| 🌐 Browser built-in translators                  | Simple automatic page translation               | Browser-account coupling, opaque provider choice             | User-selected providers and local config |
| 🤖 General AI sidebar or assistant extensions    | Chat, writing, summarizing, action panels       | General AI workspace, prompt launcher, assistant overlay     | Translation prompts for reading context  |
| 📊 Productivity or telemetry-heavy browser tools | Dashboards, usage statistics, sync accounts     | Statistics, config backup, telemetry dashboard               | Local-only settings                      |

## Removed Upstream Features

| Removed capability                                     | Why it is absent                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 🗄️ Notebase hosted storage and backend-backed features | Vibe Reading does not rely on a project-hosted backend.                                   |
| 🧠 Custom AI Actions                                   | This fork is not a general AI action launcher.                                            |
| 🎬 Video Subtitles                                     | Video translation is outside the reading-only scope.                                      |
| ⌨️ Input Translation                                   | Vibe Reading avoids modifying text input workflows.                                       |
| 🧰 Overlay Tools                                       | Less overlay UI means fewer distractions on reading pages.                                |
| 🔊 Text to Speech                                      | Audio playback is outside the reading-only scope.                                         |
| 🔗 translation-hub                                     | No bundled upstream hub integration.                                                      |
| ☁️ Config Backup                                       | Vibe Reading keeps settings local and has no config sync, backup, import, or export flow. |
| 🧪 Beta Experience                                     | Experimental feature gates are removed.                                                   |
| 🚦 Extension Activation Mode                           | Page translation is controlled by direct translation actions and page rules.              |
| 📈 Statistics                                          | No local statistics dashboard or charting dependency.                                     |
| 🌍 Language Detection mode setting                     | Language detection always follows the LLM path; there is no basic/LLM mode knob.          |

The result is deliberately simple: **Vibe Reading is for reading.**

## Development

```bash
pnpm install
pnpm test
pnpm type-check
pnpm build
```

Run `pnpm test:e2e` for provider settings and word-prefix emphasis changes. It
builds the extension and opens it in headless Chromium through `agent-browser`,
which must be installed with its Chromium runtime. The tests use local HTTP
provider fakes matching the documented models and chat completions APIs;
no provider credentials are required. After building,
run a subset with `node --test --test-name-pattern='user refreshes' scripts/e2e/provider-models.e2e.mjs`.
Run `pnpm test` for the full local regression suite before release.

## License And Attribution

Vibe Reading is a modified fork of
[Read Frog](https://github.com/mengxi-ream/read-frog). Thanks to the Read Frog
authors and contributors for the original GPL-licensed work.

This project is distributed under the GNU General Public License version 3. See
[LICENSE](./LICENSE) for the full license text. As a modified version, Vibe
Reading preserves the GPLv3 terms, keeps the source available under the same
license, and marks the work as changed so issues in this fork are not attributed
to the upstream project.
