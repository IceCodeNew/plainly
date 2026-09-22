import { IconChevronDown } from "@tabler/icons-react"
import { useAtom } from "jotai"
import { useState } from "react"
import { i18n } from "#imports"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/base-ui/collapsible"
import { configFieldsAtomMap } from "@/utils/atoms/config"
import {
  MAX_CHARACTERS_PER_NODE,
  MAX_PRELOAD_MARGIN,
  MAX_PRELOAD_THRESHOLD,
  MAX_WORDS_PER_NODE,
  MIN_BATCH_CHARACTERS,
  MIN_BATCH_ITEMS,
  MIN_CHARACTERS_PER_NODE,
  MIN_PRELOAD_MARGIN,
  MIN_PRELOAD_THRESHOLD,
  MIN_TRANSLATE_CAPACITY,
  MIN_TRANSLATE_RATE,
  MIN_WORDS_PER_NODE,
} from "@/utils/constants/translate"
import { sendMessage } from "@/utils/message"
import { cn } from "@/utils/styles/utils"
import { ConfirmAction } from "../../components/confirm-action"
import { NumberSetting } from "../../components/number-setting"

function ClearCacheRow() {
  const [clearing, setClearing] = useState(false)

  const clearCache = async () => {
    setClearing(true)
    try {
      await sendMessage("clearAllTranslationRelatedCache")
    }
    finally {
      setClearing(false)
    }
  }

  return (
    <div className="col-span-full flex items-center justify-between gap-3 border-t border-border pt-3">
      <span className="text-xs text-muted-foreground">{i18n.t("options.advanced.cache.description")}</span>
      <ConfirmAction
        disabled={clearing}
        trigger={(
          <button type="button" className="rounded-md border border-border bg-card px-2.5 py-1 text-xs hover:bg-muted">
            {clearing ? i18n.t("options.advanced.cache.clearing") : i18n.t("options.advanced.cache.clear")}
          </button>
        )}
        title={i18n.t("options.advanced.cache.dialog.title")}
        description={i18n.t("options.advanced.cache.dialog.description")}
        confirmLabel={i18n.t("options.advanced.cache.dialog.confirm")}
        cancelLabel={i18n.t("options.advanced.cache.dialog.cancel")}
        onConfirm={clearCache}
      />
    </div>
  )
}

export function AdvancedSection() {
  const [open, setOpen] = useState(false)
  const [translateConfig, setTranslateConfig] = useAtom(configFieldsAtomMap.translate)
  const { requestQueueConfig, batchQueueConfig, page } = translateConfig

  return (
    <section id="advanced" className="flex scroll-mt-8 flex-col gap-3.5">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex cursor-pointer items-center gap-1.5 text-left">
          <IconChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} aria-hidden="true" />
          <h2 className="text-[15px] font-semibold">{i18n.t("options.advanced.title")}</h2>
          <span className="ml-1 text-xs text-muted-foreground">{i18n.t("options.advanced.hint")}</span>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3.5 grid grid-cols-1 gap-x-6 gap-y-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
            <NumberSetting
              id="advanced-rate"
              label={i18n.t("options.advanced.rate")}
              value={requestQueueConfig.rate}
              min={MIN_TRANSLATE_RATE}
              onChange={(rate) => {
                void setTranslateConfig({ ...translateConfig, requestQueueConfig: { ...requestQueueConfig, rate } })
                void sendMessage("setTranslateRequestQueueConfig", { rate })
              }}
            />
            <NumberSetting
              id="advanced-capacity"
              label={i18n.t("options.advanced.capacity")}
              value={requestQueueConfig.capacity}
              min={MIN_TRANSLATE_CAPACITY}
              onChange={(capacity) => {
                void setTranslateConfig({ ...translateConfig, requestQueueConfig: { ...requestQueueConfig, capacity } })
                void sendMessage("setTranslateRequestQueueConfig", { capacity })
              }}
            />
            <NumberSetting
              id="advanced-batch-characters"
              label={i18n.t("options.advanced.maxCharactersPerBatch")}
              value={batchQueueConfig.maxCharactersPerBatch}
              min={MIN_BATCH_CHARACTERS}
              onChange={(maxCharactersPerBatch) => {
                void setTranslateConfig({ ...translateConfig, batchQueueConfig: { ...batchQueueConfig, maxCharactersPerBatch } })
                void sendMessage("setTranslateBatchQueueConfig", { maxCharactersPerBatch })
              }}
            />
            <NumberSetting
              id="advanced-batch-items"
              label={i18n.t("options.advanced.maxItemsPerBatch")}
              value={batchQueueConfig.maxItemsPerBatch}
              min={MIN_BATCH_ITEMS}
              onChange={(maxItemsPerBatch) => {
                void setTranslateConfig({ ...translateConfig, batchQueueConfig: { ...batchQueueConfig, maxItemsPerBatch } })
                void sendMessage("setTranslateBatchQueueConfig", { maxItemsPerBatch })
              }}
            />
            <NumberSetting
              id="advanced-preload-margin"
              label={i18n.t("options.advanced.preloadMargin")}
              value={page.preload.margin}
              min={MIN_PRELOAD_MARGIN}
              max={MAX_PRELOAD_MARGIN}
              step={100}
              onChange={margin => void setTranslateConfig({ ...translateConfig, page: { ...page, preload: { ...page.preload, margin } } })}
            />
            <NumberSetting
              id="advanced-preload-threshold"
              label={i18n.t("options.advanced.preloadThreshold")}
              value={page.preload.threshold}
              min={MIN_PRELOAD_THRESHOLD}
              max={MAX_PRELOAD_THRESHOLD}
              step={0.1}
              onChange={threshold => void setTranslateConfig({ ...translateConfig, page: { ...page, preload: { ...page.preload, threshold } } })}
            />
            <NumberSetting
              id="advanced-min-characters"
              label={i18n.t("options.advanced.minCharacters")}
              value={page.minCharactersPerNode}
              min={MIN_CHARACTERS_PER_NODE}
              max={MAX_CHARACTERS_PER_NODE}
              onChange={minCharactersPerNode => void setTranslateConfig({ ...translateConfig, page: { ...page, minCharactersPerNode } })}
            />
            <NumberSetting
              id="advanced-min-words"
              label={i18n.t("options.advanced.minWords")}
              value={page.minWordsPerNode}
              min={MIN_WORDS_PER_NODE}
              max={MAX_WORDS_PER_NODE}
              onChange={minWordsPerNode => void setTranslateConfig({ ...translateConfig, page: { ...page, minWordsPerNode } })}
            />
            <ClearCacheRow />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
