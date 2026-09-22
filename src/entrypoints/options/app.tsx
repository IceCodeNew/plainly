import { useEffect } from "react"
import { AdvancedSection } from "./sections/advanced"
import { SettingsFooter } from "./sections/footer"
import { SettingsHeader } from "./sections/header"
import { ProvidersSection } from "./sections/providers"
import { QualitySection } from "./sections/quality"
import { ReadingSection } from "./sections/reading"

function useScrollToHashSection() {
  useEffect(() => {
    const sectionId = window.location.hash.slice(1)
    if (!sectionId)
      return
    document.getElementById(sectionId)?.scrollIntoView({ block: "start" })
  }, [])
}

/**
 * One page, ordered by how often a setting is touched: the service you
 * translate with, how translations read, what the model is told, and the
 * knobs almost nobody changes.
 */
export default function App() {
  useScrollToHashSection()

  return (
    <main className="mx-auto flex w-full max-w-[640px] flex-col gap-10 px-6 pt-12 pb-16 text-[13px]">
      <SettingsHeader />
      <ProvidersSection />
      <ReadingSection />
      <QualitySection />
      <AdvancedSection />
      <SettingsFooter />
    </main>
  )
}
