import type { LangCodeISO6393 } from "@/definitions"
import type { Config } from "@/types/config/config"
import type { PromptLanguage, TranslatePromptObj } from "@/types/config/translate"
import type { WebPagePromptContext } from "@/types/content"
import { getLocalConfig } from "@/utils/config/storage"
import { DEFAULT_CONFIG } from "../constants/config"
import {
  BATCH_RULE,
  BATCH_RULE_TEXT,
  BATCH_TRANSLATE_RULES,
  getTokenCellText,
  INPUT,
  isDomainPromptId,
  renderBuiltinTranslatePrompt,
  TARGET_LANGUAGE,
  WEB_CONTENT,
  WEB_DESCRIPTION,
  WEB_SUMMARY,
  WEB_TITLE,
} from "../constants/prompt"
import { getTargetLanguageName, resolvePromptLanguage } from "./prompt-language"

export interface TranslatePromptOptions<TContext = unknown> {
  isBatch?: boolean
  context?: TContext
}

export interface TranslatePromptResult {
  systemPrompt: string
  prompt: string
}

export function resolvePromptReplacementValue(value: string | null | undefined, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value : fallback
}

export function getTranslatePromptFromConfig(
  translateConfig: Pick<Config["translate"], "customPromptsConfig" | "promptLanguage">,
  targetCode: LangCodeISO6393,
  input: string,
  options?: TranslatePromptOptions<WebPagePromptContext>,
): TranslatePromptResult {
  const { patterns, promptId } = translateConfig.customPromptsConfig
  const promptLanguage = resolvePromptLanguage(translateConfig.promptLanguage, targetCode)
  const customPrompt = patterns.find(pattern => pattern.id === promptId)
  if (customPrompt) {
    const customPromptLanguage = customPrompt.promptLanguage ?? promptLanguage
    return renderCustomPrompt(customPrompt, customPromptLanguage, getTargetLanguageName(targetCode, customPromptLanguage), input, options)
  }

  return {
    systemPrompt: "",
    prompt: renderBuiltinTranslatePrompt({
      promptLanguage,
      targetLanguage: getTargetLanguageName(targetCode, promptLanguage),
      input,
      domainId: isDomainPromptId(promptId) ? promptId : undefined,
      webTitle: options?.context?.webTitle,
      webSummary: options?.context?.webSummary,
      batchRule: options?.isBatch ? BATCH_RULE_TEXT[promptLanguage] : undefined,
    }),
  }
}

const BATCH_RULE_CELL = getTokenCellText(BATCH_RULE)
const INPUT_CELL = getTokenCellText(INPUT)
const TARGET_LANGUAGE_CELL = getTokenCellText(TARGET_LANGUAGE)
const WEB_CONTENT_CELL = getTokenCellText(WEB_CONTENT)
const PAGE_VALUE_TOKENS = [WEB_TITLE, WEB_DESCRIPTION, WEB_SUMMARY] as const
// Nothing, or a short label such as "Title:" or "摘要：".
const LABEL_ONLY_LINE = /^(?:[^{}:：]{0,24}[:：])?$/

/**
 * A custom prompt with {{batchRule}} gets the batch rule there in a batch
 * request, and loses that line otherwise. A custom prompt without it gets
 * the English batch rules in the system prompt.
 */
function renderCustomPrompt(
  customPrompt: TranslatePromptObj,
  promptLanguage: PromptLanguage,
  targetLanguage: string,
  input: string,
  options?: TranslatePromptOptions<WebPagePromptContext>,
): TranslatePromptResult {
  const hasBatchRule = customPrompt.systemPrompt.includes(BATCH_RULE_CELL) || customPrompt.prompt.includes(BATCH_RULE_CELL)
  const systemPrompt = options?.isBatch && !hasBatchRule
    ? `${customPrompt.systemPrompt}

${BATCH_TRANSLATE_RULES}`
    : customPrompt.systemPrompt
  const replaceBatchRule = (text: string) => options?.isBatch
    ? text.replaceAll(BATCH_RULE_CELL, BATCH_RULE_TEXT[promptLanguage])
    : text.replaceAll(`\n${BATCH_RULE_CELL}`, "").replaceAll(BATCH_RULE_CELL, "")

  // Page context that the page does not have is left out, like in built-in
  // prompts: a line with only a label and missing values goes away, and in
  // other lines a missing value is empty. The page content keeps its fallback
  // text, because built-in prompts do not use it.
  const pageValues = PAGE_VALUE_TOKENS.map(token => [getTokenCellText(token), options?.context?.[token]?.trim() ?? ""] as const)
  const missingCells = pageValues.filter(([, value]) => !value).map(([cell]) => cell)
  const isLabelOnly = (line: string) => LABEL_ONLY_LINE.test(missingCells.reduce((rest, cell) => rest.replaceAll(cell, ""), line).trim())
  const removeMissingLines = (text: string) => missingCells.length === 0
    ? text
    : text.split("\n").filter(line => !missingCells.some(cell => line.includes(cell)) || !isLabelOnly(line)).join("\n")
  const contentText = resolvePromptReplacementValue(options?.context?.webContent, "No content available")

  // The input goes in last, so that tokens in the source text stay as they are.
  const replaceTokens = (text: string) => pageValues
    .reduce((result, [cell, value]) => result.replaceAll(cell, value), removeMissingLines(replaceBatchRule(text)))
    .replaceAll(TARGET_LANGUAGE_CELL, targetLanguage)
    .replaceAll(WEB_CONTENT_CELL, contentText)
    .replaceAll(INPUT_CELL, input)

  return {
    systemPrompt: replaceTokens(systemPrompt),
    prompt: replaceTokens(customPrompt.prompt),
  }
}

export async function getTranslatePrompt(
  targetCode: LangCodeISO6393,
  input: string,
  options?: TranslatePromptOptions<WebPagePromptContext>,
): Promise<TranslatePromptResult> {
  const config = await getLocalConfig() ?? DEFAULT_CONFIG
  return getTranslatePromptFromConfig(config.translate, targetCode, input, options)
}
