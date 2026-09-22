import { browser } from "#imports"
import { logger } from "@/utils/logger"

const ICON_SIZES = [16, 32] as const
const ACTIVE_DOT_COLOR = "#B8892E"
const ACTIVE_DOT_RING_COLOR = "#FFFFFF"

type IconSize = (typeof ICON_SIZES)[number]

const baseIconPromises = new Map<IconSize, Promise<ImageBitmap>>()
const renderedIcons = new Map<string, Promise<ImageData>>()

function loadBaseIcon(size: IconSize): Promise<ImageBitmap> {
  let promise = baseIconPromises.get(size)
  if (!promise) {
    promise = fetch(browser.runtime.getURL(`/icon/${size}.png`))
      .then(response => response.blob())
      .then(blob => createImageBitmap(blob))
    baseIconPromises.set(size, promise)
  }
  return promise
}

async function renderIcon(size: IconSize, active: boolean): Promise<ImageData> {
  const key = `${size}:${active}`
  let promise = renderedIcons.get(key)
  if (!promise) {
    promise = (async () => {
      const bitmap = await loadBaseIcon(size)
      const canvas = new OffscreenCanvas(size, size)
      const context = canvas.getContext("2d")
      if (!context)
        throw new Error("OffscreenCanvas 2d context unavailable")

      context.drawImage(bitmap, 0, 0, size, size)

      if (active) {
        // Small dot in the top-right corner marks "translation on for this tab".
        const radius = Math.max(2, size * 0.16)
        const cx = size - radius - 1
        const cy = radius + 1
        context.beginPath()
        context.arc(cx, cy, radius + 1.5, 0, Math.PI * 2)
        context.fillStyle = ACTIVE_DOT_RING_COLOR
        context.fill()
        context.beginPath()
        context.arc(cx, cy, radius, 0, Math.PI * 2)
        context.fillStyle = ACTIVE_DOT_COLOR
        context.fill()
      }

      return context.getImageData(0, 0, size, size)
    })()
    renderedIcons.set(key, promise)
  }
  return promise
}

/**
 * Reflects a tab's page translation state on the toolbar icon so the reader
 * can see it without opening the popup.
 */
export async function updateActionIcon(tabId: number, active: boolean): Promise<void> {
  try {
    const imageData: Record<number, ImageData> = {}
    for (const size of ICON_SIZES) {
      imageData[size] = await renderIcon(size, active)
    }
    await browser.action.setIcon({ tabId, imageData })
  }
  catch (error) {
    // The tab may already be gone, or the platform may lack OffscreenCanvas.
    logger.warn("Failed to update action icon", error)
  }
}
