import { atom } from "jotai"
import { configAtom } from "@/utils/atoms/config"

const explicitExpandedProviderIdAtom = atom<string | null | undefined>(undefined)

/**
 * Which provider row shows its editor. Defaults to the provider used for
 * translation until the reader opens another one.
 */
export const expandedProviderIdAtom = atom(
  (get) => {
    const explicit = get(explicitExpandedProviderIdAtom)
    if (explicit !== undefined)
      return explicit
    return get(configAtom).translate.providerId
  },
  (_get, set, id: string | null) => {
    set(explicitExpandedProviderIdAtom, id)
  },
)
