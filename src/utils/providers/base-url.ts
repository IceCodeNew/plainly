/** Returns the configured base URL without surrounding spaces or trailing slashes, or undefined when it is empty. */
export function normalizeBaseURL(baseURL: string | undefined): string | undefined {
  return baseURL?.trim().replace(/\/+$/, "") || undefined
}
