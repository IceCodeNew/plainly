# Plainly

素读 · [中文](./README.zh-CN.md)

Plainly translates the web page you are reading, and does nothing else.

The translation sits under each paragraph, or replaces the original if you
prefer. Settings stay in your browser. Text goes straight to the model provider
you configure. There is no Plainly server, no account, and no telemetry. See
the [privacy policy](./PRIVACY.md).

## What It Does

- Translates the whole page, including its title, in bilingual or
  translation-only mode.
- Works with OpenAI, DeepSeek, or any OpenAI-compatible endpoint, including
  local and self-hosted models.
- Can give the model a summary of the page, so translations fit the context.
- Lets you adjust the prompt, translation style, request rate, and batching.

## What It Leaves Out

Plainly began as a fork of [Read Frog](https://github.com/mengxi-ream/read-frog)
and removed everything that is not reading a page: video subtitles, input box
translation, floating toolbars, text to speech, custom AI actions, hosted
storage and accounts, config sync, statistics, and experimental switches.

If you need those, Read Frog and similar tools do them well. Plainly stays
small so that the page stays quiet.

## Changes From Upstream

This fork follows [Xuanwo/plainly](https://github.com/Xuanwo/plainly). It adds
these changes:

- Each provider, including OpenAI and DeepSeek, gets its current model list
  from its `/models` endpoint. The request uses the custom headers of the
  provider. A local endpoint can reply without an API key. The model field
  accepts any model ID and cannot be saved empty. Model requests and
  translation requests ignore trailing slashes in the base URL.
- An optional word-prefix emphasis setting in the Reading section makes the
  start of Latin words bold. Page styles for `span`, `b`, `strong` or
  `:last-child` do not change the layout of the emphasized text. Page rules
  that count child elements, for example `:first-child`, can still match
  differently. Translation requests contain only the original text.
- Settings that you type quickly no longer revert to an earlier value.
- Messages to tabs without the content script no longer cause unchecked
  `runtime.lastError` entries on the extension error page.
- Prompt export uses the browser download function. The `file-saver`
  dependency is removed.
- The dependencies use current major versions, for example AI SDK 7, Jotai 3,
  Vitest 5, WXT 0.21 and pnpm 12.
- prek runs the Git hooks. Renovate updates the dependencies. The workflows
  use actions pinned to commit SHAs. CI also tests the built extension in
  headless Chrome.

## Development

```bash
pnpm install
pnpm exec prek install
pnpm test
pnpm type-check
pnpm build
```

[prek](https://github.com/j178/prek) manages the Git hooks in
[`prek.toml`](./prek.toml). Before a commit, it runs lint-staged. It checks
commit messages with commitlint. Before a push, it runs lint, type checks and
tests. To run the same repository checks as CI, use
`pnpm exec prek run --all-files --stage manual`.

If `git config --get core.hooksPath` shows `.husky/_`, run
`git config --local --unset core.hooksPath` before `pnpm exec prek install`.

`pnpm test:e2e` builds the extension and opens it in headless Chromium through
[Playwright](https://playwright.dev/), a development dependency. Before the
first run, run `pnpm exec playwright-core install --no-shell chromium` to
download Chromium. On Linux, add `--with-deps` to also install the system
libraries. CI runs the same tests.

## License

Plainly is a modified version of Read Frog. Thanks to the Read Frog authors and
contributors for the original work.

Plainly is distributed under the GNU General Public License version 3, the same
license as upstream. See [LICENSE](./LICENSE). Please report problems here
rather than to the Read Frog project.
