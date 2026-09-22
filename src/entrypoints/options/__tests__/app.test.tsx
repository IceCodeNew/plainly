// @vitest-environment jsdom
import { QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createStore, Provider } from "jotai"
import { afterEach, describe, expect, it, vi } from "vitest"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { TooltipProvider } from "@/components/ui/base-ui/tooltip"
import { configAtom } from "@/utils/atoms/config"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { queryClient } from "@/utils/tanstack-query"
import App from "../app"

vi.mock("@/utils/message", () => ({
  onMessage: vi.fn(() => vi.fn()),
  sendMessage: vi.fn(() => Promise.resolve(undefined)),
}))

vi.mock("@/components/ui/json-code-editor", () => ({
  JSONCodeEditor: () => <textarea aria-label="json-editor" readOnly />,
}))

vi.mock("@/components/ui/css-code-editor", () => ({
  CSSCodeEditor: () => <textarea aria-label="css-editor" readOnly />,
}))

function renderSettings() {
  const store = createStore()
  store.set(configAtom, DEFAULT_CONFIG)

  return render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <ThemeProvider>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </ThemeProvider>
      </Provider>
    </QueryClientProvider>,
  )
}

describe("settings page", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders every section on one page in usage order", () => {
    const { container } = renderSettings()

    const sectionIds = [...container.querySelectorAll("section[id]")].map(section => section.id)
    expect(sectionIds).toEqual(["providers", "reading", "quality", "advanced"])
  })

  it("lists the default services with the active one expanded for editing", () => {
    renderSettings()

    const radios = screen.getAllByRole("radio", { name: /options\.providers\.useForTranslation/ })
    expect(radios).toHaveLength(DEFAULT_CONFIG.providersConfig.length)
    expect(radios[0]).toBeChecked()
    expect(screen.getByLabelText("options.providers.form.apiKey")).toBeInTheDocument()
  })

  it("keeps the advanced knobs collapsed until opened", () => {
    renderSettings()

    expect(screen.queryByLabelText("options.advanced.rate")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /options\.advanced\.title/ }))
    expect(screen.getByLabelText("options.advanced.rate")).toBeInTheDocument()
  })
})
