import type { PromptLanguage } from "@/types/config/translate"

export const WEB_PAGE_PROMPT_TOKENS = ["targetLanguage", "input", "webTitle", "webDescription", "webContent", "webSummary"] as const
export const TOKENS = WEB_PAGE_PROMPT_TOKENS

/**
 * Separator used to distinguish multiple text segments in batch translation.
 * It is used to differentiate different text paragraphs when merging multiple translation tasks into a single request.
 */
export const BATCH_SEPARATOR = "%%"
export const BATCH_SEPARATOR_LINE_PATTERN = /\r?\n[ \t]*%%[ \t]*\r?\n/

export const TARGET_LANGUAGE = WEB_PAGE_PROMPT_TOKENS[0]
export const INPUT = WEB_PAGE_PROMPT_TOKENS[1]
export const WEB_TITLE = WEB_PAGE_PROMPT_TOKENS[2]
export const WEB_DESCRIPTION = WEB_PAGE_PROMPT_TOKENS[3]
export const WEB_CONTENT = WEB_PAGE_PROMPT_TOKENS[4]
export const WEB_SUMMARY = WEB_PAGE_PROMPT_TOKENS[5]

export const getTokenCellText = (token: string) => `{{${token}}}`

/** Rules for custom prompts in requests that join several paragraphs with {@link BATCH_SEPARATOR} lines. */
export const BATCH_TRANSLATE_RULES = `## Multi-paragraph Translation Rules
1. If input contains a standalone line containing only ${BATCH_SEPARATOR}, use a standalone ${BATCH_SEPARATOR} line in your output. If input has no standalone ${BATCH_SEPARATOR} line, don't use ${BATCH_SEPARATOR} in your output.
2. **CRITICAL**: Treat ${BATCH_SEPARATOR} as a separator only when it appears on its own line. Do not treat ${BATCH_SEPARATOR} as a separator when it appears inside normal text, code, quotes, or punctuation.

## OUTPUT FORMAT:
- **Single paragraph input** → Output translation directly (no separators, no extra text)
- **Multi-paragraph input (input uses standalone ${BATCH_SEPARATOR} separator lines)** → Put ${BATCH_SEPARATOR} on its own line between translations

## Examples

### Multi-paragraph Input:
Paragraph A

${BATCH_SEPARATOR}

Paragraph B

${BATCH_SEPARATOR}

Paragraph C

### Multi-paragraph Output:
Translation A

${BATCH_SEPARATOR}

Translation B

${BATCH_SEPARATOR}

Translation C

### Single paragraph Input:
Single paragraph content

### Single paragraph Output:
Direct translation without separators
`

export const DOMAIN_PROMPT_IDS = ["builtin:legal", "builtin:medical", "builtin:finance", "builtin:technology"] as const
export type DomainPromptId = typeof DOMAIN_PROMPT_IDS[number]

export function isDomainPromptId(id: string | null): id is DomainPromptId {
  return DOMAIN_PROMPT_IDS.includes(id as DomainPromptId)
}

const DOMAIN_STYLES: Record<DomainPromptId, Record<PromptLanguage, string>> = {
  "builtin:legal": {
    en: "formal legal language, with accurate legal terms, and clause numbers and defined terms kept as in the source",
    zh: "正式的法律文书语体，法律术语准确，条款编号和定义术语与原文一致",
  },
  "builtin:medical": {
    en: "professional medical language, with standard medical terms, and drug names, doses and units kept exactly as in the source",
    zh: "专业的医学语体，使用规范的医学术语，药品名称、剂量和单位与原文完全一致",
  },
  "builtin:finance": {
    en: "professional financial language, with standard financial and accounting terms, and numbers, currencies and ticker symbols kept exactly as in the source",
    zh: "专业的金融语体，使用规范的金融和会计术语，数字、币种和股票代码与原文完全一致",
  },
  "builtin:technology": {
    en: `technical documentation language, with consistent technical terms, and code, commands, identifiers and placeholders such as {{var}}, \${var} and %s kept untranslated`,
    zh: `技术文档语体，技术术语前后一致，代码、命令、标识符以及 {{var}}、\${var}、%s 等占位符保持原样不译`,
  },
}

export interface BuiltinTranslatePromptInput {
  promptLanguage: PromptLanguage
  targetLanguage: string
  input: string
  domainId?: DomainPromptId
  webTitle?: string | null
  webSummary?: string | null
  isBatch?: boolean
}

/**
 * Renders a built-in prompt from the Hy-MT2 translation instruction templates
 * (https://huggingface.co/tencent/Hy-MT2-7B): "Background" when the page has
 * a title or summary, "Style" for a domain prompt, and "Default" otherwise.
 * A batch adds the Hy-MT2 "Delimiters" rule. Hy-MT2 has no system prompt, so
 * everything goes in the user message.
 *
 * Every instruction asks for the translation only: without it, models copied
 * the background labels into the translation in batch tests.
 */
export function renderBuiltinTranslatePrompt({ promptLanguage, targetLanguage, input, domainId, webTitle, webSummary, isBatch }: BuiltinTranslatePromptInput): string {
  const zh = promptLanguage === "zh"
  const style = domainId && DOMAIN_STYLES[domainId][promptLanguage]
  const background = [
    webTitle?.trim() && `${zh ? "标题" : "Title"}: ${webTitle.trim()}`,
    webSummary?.trim() && `${zh ? "摘要" : "Summary"}: ${webSummary.trim()}`,
  ].filter(Boolean).join("\n")
  // The official "Default" template ends with a colon before the text.
  const end = !background && !style && !isBatch ? (zh ? "：" : ":") : (zh ? "。" : ".")

  const instruction = zh
    ? [
        `${background ? "请结合背景信息将以下文本翻译为" : "将以下文本翻译为"}${targetLanguage}，注意只需要输出翻译后的结果，不要额外解释${end}`,
        style && `注意翻译的风格要严格符合【${style}】`,
        isBatch && "你必须在译文中保留等量的分隔符，绝对不可遗漏、转义或翻译该符号，并注意分隔符的位置。",
      ]
    : [
        `${background ? `Please translate the following text into ${targetLanguage}, taking the provided background information into consideration.` : `Translate the following text into ${targetLanguage}.`} Note that you should only output the translated result without any additional explanation${end}`,
        style && `Note that the translation style must strictly conform to [${style}].`,
        isBatch && "You must retain the exact same number of delimiters in the translation. Strictly do not omit, escape, or translate these symbols, and pay close attention to their placement.",
      ]

  return [
    background && `${zh ? "【背景信息】" : "[Background Information]"}\n${background}`,
    instruction.filter(Boolean).join("\n"),
    background ? `${zh ? "【待翻译文本】" : "[Source Text]"}\n${input}` : input,
  ].filter(Boolean).join("\n\n")
}

/**
 * UI sentinel value for default prompt selection
 * NOTE: This is NOT stored in config - it's only used in UI components
 * Config stores `null` for default, this string is just for Select/UI compatibility
 */
export const DEFAULT_TRANSLATE_PROMPT_ID = "__default__"

export function isBuiltinPromptId(id: string): boolean {
  return id === DEFAULT_TRANSLATE_PROMPT_ID || isDomainPromptId(id)
}

export const DEFAULT_TRANSLATE_PROMPTS_CONFIG = {
  promptId: null,
  patterns: [],
}
