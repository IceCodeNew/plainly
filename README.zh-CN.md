# 素读

Plainly · [English](./README.md)

素读只做一件事：翻译你正在读的网页。

译文放在每段原文下方，也可以只显示译文。设置保存在你的浏览器里，文本直接发给你配置的模型服务商。素读没有服务器，没有账号，也不收集使用数据。详见[隐私政策](./PRIVACY.md)。

## 能做什么

- 翻译整个网页和页面标题，支持双语对照和仅译文两种模式。
- 支持 OpenAI、DeepSeek 以及任何 OpenAI 兼容端点，包括本地和自托管模型。
- 可以把页面摘要交给模型，让译文贴合上下文。
- 可以调整 Prompt、译文样式、请求速率和批量大小。

## 没有什么

素读从 [Read Frog（陪读蛙）](https://github.com/mengxi-ream/read-frog) fork 而来，去掉了阅读网页以外的一切：视频字幕、输入框翻译、悬浮工具栏、朗读、自定义 AI 动作、托管存储与账号、配置同步、统计和实验功能开关。

需要这些功能的话，陪读蛙和同类工具做得很好。素读保持小巧，让页面保持安静。

## 相对上游的改动

本 fork 跟随 [Xuanwo/plainly](https://github.com/Xuanwo/plainly)，另有以下改动：

- OpenAI、DeepSeek 等所有服务都能从各自的 `/models` 接口获取当前模型列表，请求带上该服务的自定义 header；本地端点不填 API key 也能获取。模型字段可以填写任意模型 ID，但不能保存为空。获取模型和翻译请求都会忽略 base URL 末尾的斜杠。
- 「阅读」设置里新增可选的词首强调，加粗拉丁字母单词的开头。页面上针对 `span`、`b`、`strong` 或 `:last-child` 的样式不会改变加粗文字的布局，但按子元素计数的规则（如 `:first-child`）仍可能匹配到不同的元素。翻译请求里只有原文。
- 快速输入设置时，已输入的内容不再被回退成旧值。
- 向没有内容脚本的标签页发消息时，扩展错误页不再出现未检查的 `runtime.lastError`。
- 导出提示词改用浏览器原生下载，移除了 `file-saver` 依赖。
- 依赖升级到当前大版本，例如 AI SDK 7、Jotai 3、Vitest 5、WXT 0.21 和 pnpm 12。
- Git hooks 由 prek 运行，依赖由 Renovate 更新，workflow 中的 action 固定到 commit SHA，CI 还会在无头 Chrome 中测试构建好的扩展。

## 开发

```bash
pnpm install
pnpm exec prek install
pnpm test
pnpm type-check
pnpm build
```

Git hooks 由 [prek](https://github.com/j178/prek) 管理，配置在 [`prek.toml`](./prek.toml)：提交前运行 lint-staged，检查提交信息，推送前运行 lint、类型检查和测试。运行 `pnpm exec prek run --all-files --stage manual` 可执行与 CI 相同的仓库检查。

如果 `git config --get core.hooksPath` 输出 `.husky/_`，先运行 `git config --local --unset core.hooksPath`，再执行 `pnpm exec prek install`。

`pnpm test:e2e` 会先构建扩展，再通过开发依赖 [Playwright](https://playwright.dev/) 在无头 Chromium 中打开它。首次运行前执行 `pnpm exec playwright-core install --no-shell chromium` 下载 Chromium；Linux 上加 `--with-deps` 同时安装系统库。CI 也会运行这些测试。

## 许可

素读是 Read Frog 的修改版本，感谢 Read Frog 的作者和贡献者提供原始作品。

素读与上游一样按 GNU General Public License version 3 分发，见 [LICENSE](./LICENSE)。遇到问题请在本仓库反馈，不要提交给 Read Frog 项目。
