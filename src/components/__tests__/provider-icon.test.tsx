// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import ProviderIcon from "../provider-icon"

describe("providerIcon", () => {
  it("renders a monogram and the provider name without any image request", () => {
    const { container } = render(<ProviderIcon providerType="openai" name="OpenAI" />)

    expect(screen.getByText("OpenAI")).toBeInTheDocument()
    expect(screen.getByText("O")).toBeInTheDocument()
    expect(container.querySelector("img")).toBeNull()
  })

  it("renders only the mark when no name is given", () => {
    render(<ProviderIcon providerType="deepseek" />)

    expect(screen.getByText("D")).toBeInTheDocument()
    expect(screen.queryByText("DeepSeek")).toBeNull()
  })
})
