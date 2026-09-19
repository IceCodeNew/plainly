import type {
  APIProviderTypes,
  CustomLLMProviderTypes,
  LLMProviderTypes,
  NonCustomLLMProviderTypes,
  TranslateProviderTypes,
} from "./constants"

import { z } from "zod"

/* ──────────────────────────────
  Providers config schema
  ────────────────────────────── */

const providerModelSchema = z.object({
  model: z.string().nonempty(),
  isCustomModel: z.boolean(),
  customModel: z.string().nullable(),
})

// Base schema without models
export const baseProviderConfigSchema = z.strictObject({
  id: z.string().nonempty(),
  name: z.string().nonempty(),
  description: z.string().optional(),
  enabled: z.boolean(),
})

export const baseAPIProviderConfigSchema = baseProviderConfigSchema.extend({
  apiKey: z.string().optional(),
  baseURL: z.string().optional(),
  temperature: z.number().min(0).optional(),
  providerOptions: z.record(z.string(), z.any()).optional(),
  headers: z.record(z.string(), z.any()).optional(),
})

export const baseCustomLLMProviderConfigSchema = baseAPIProviderConfigSchema.extend({
  baseURL: z.string(),
})

const llmProviderConfigSchemaList = [
  baseCustomLLMProviderConfigSchema.extend({
    provider: z.literal("openai-compatible"),
    model: providerModelSchema.extend({ isCustomModel: z.literal(true) }),
  }),
  baseAPIProviderConfigSchema.extend({
    provider: z.literal("openai"),
    model: providerModelSchema,
  }),
  baseAPIProviderConfigSchema.extend({
    provider: z.literal("deepseek"),
    model: providerModelSchema,
  }),
] as const

const apiProviderConfigSchemaList = [
  ...llmProviderConfigSchemaList,
] as const

export const providerConfigSchemaList = [
  ...apiProviderConfigSchemaList,
] as const

export const llmProviderConfigItemSchema = z.discriminatedUnion("provider", llmProviderConfigSchemaList)
export const apiProviderConfigItemSchema = z.discriminatedUnion("provider", apiProviderConfigSchemaList)
export const providerConfigItemSchema = z.discriminatedUnion("provider", providerConfigSchemaList)

export const providersConfigSchema = z.array(providerConfigItemSchema).superRefine(
  (providers, ctx) => {
    const idSet = new Set<string>()
    providers.forEach((provider, index) => {
      if (idSet.has(provider.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate provider id "${provider.id}"`,
          path: [index, "id"],
        })
      }
      idSet.add(provider.id)
    })

    const nameSet = new Set<string>()
    providers.forEach((provider, index) => {
      if (nameSet.has(provider.name)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate provider name "${provider.name}"`,
          path: [index, "name"],
        })
      }
      nameSet.add(provider.name)
    })
  },
)
export type ProvidersConfig = z.infer<typeof providersConfigSchema>
export type ProviderConfig = ProvidersConfig[number]
export type APIProviderConfig = Extract<ProviderConfig, { provider: APIProviderTypes }>
export type LLMProviderConfig = Extract<ProviderConfig, { provider: LLMProviderTypes }>
export type TranslateProviderConfig = Extract<ProviderConfig, { provider: TranslateProviderTypes }>
export type NonCustomLLMProviderConfig = Extract<ProviderConfig, { provider: NonCustomLLMProviderTypes }>
export type CustomLLMProviderConfig = Extract<ProviderConfig, { provider: CustomLLMProviderTypes }>
