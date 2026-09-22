// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SegmentedControl } from "../segmented-control"

describe("segmentedControl", () => {
  it("marks the current option pressed and reports the clicked one", () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        aria-label="Display"
        value="bilingual"
        options={[
          { value: "bilingual", label: "Bilingual" },
          { value: "translationOnly", label: "Translation only" },
        ]}
        onChange={onChange}
      />,
    )

    expect(screen.getByRole("group", { name: "Display" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Bilingual" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Translation only" })).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(screen.getByRole("button", { name: "Translation only" }))
    expect(onChange).toHaveBeenCalledWith("translationOnly")
  })
})
