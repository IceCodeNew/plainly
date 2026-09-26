// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ProviderOptionsRecommendationTrigger } from "../provider-options-recommendation-trigger"

vi.mock("#imports", () => ({
  i18n: {
    t: (key: string) => key,
  },
}))

vi.mock("@/components/ui/json-code-editor", () => ({
  JSONCodeEditor: ({
    value,
    placeholder,
  }: {
    value?: string
    placeholder?: string
  }) => (
    <pre data-testid="provider-options-preview">
      {value || placeholder}
    </pre>
  ),
}))

describe("providerOptionsRecommendationTrigger", () => {
  it("user opens the recommendation for a DeepSeek provider: Given no saved options, When they apply it, Then the options that turn off thinking are saved", () => {
    const onApply = vi.fn()

    render(
      <ProviderOptionsRecommendationTrigger
        provider="deepseek"
        onApply={onApply}
      />,
    )

    fireEvent.click(screen.getByRole("button", {
      name: "options.providers.form.providerOptionsRecommendationTrigger",
    }))

    expect(screen.getByText("options.providers.form.providerOptionsRecommendationTitle")).toBeInTheDocument()
    expect(screen.getByTestId("provider-options-preview")).toHaveTextContent("\"type\": \"disabled\"")

    fireEvent.click(screen.getByRole("button", {
      name: "options.providers.form.providerOptionsRecommendationApply",
    }))

    expect(onApply).toHaveBeenCalledWith({ thinking: { type: "disabled" } })
  })

  it("user already saved the recommendation: Given the same options, When they open it, Then the apply button is disabled", () => {
    render(
      <ProviderOptionsRecommendationTrigger
        provider="openai"
        currentProviderOptions={{ reasoningEffort: "none" }}
        onApply={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole("button", {
      name: "options.providers.form.providerOptionsRecommendationTrigger",
    }))

    expect(screen.getByRole("button", {
      name: "options.providers.form.providerOptionsRecommendationApplied",
    })).toBeDisabled()
  })

  it("user opens a custom provider: Given a third-party endpoint, When the model field is shown, Then no recommendation is offered", () => {
    render(
      <ProviderOptionsRecommendationTrigger
        provider="openai-compatible"
        onApply={vi.fn()}
      />,
    )

    expect(screen.queryByRole("button", {
      name: "options.providers.form.providerOptionsRecommendationTrigger",
    })).not.toBeInTheDocument()
  })
})
