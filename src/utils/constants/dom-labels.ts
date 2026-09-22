export const CONTENT_WRAPPER_CLASS = "plainly-translated-content-wrapper"
export const INLINE_CONTENT_CLASS = "plainly-translated-inline-content"
export const BLOCK_CONTENT_CLASS = "plainly-translated-block-content"
export const FLOAT_WRAP_ATTRIBUTE = "data-plainly-float-wrap"

export const WALKED_ATTRIBUTE = "data-plainly-walked"
// paragraph means you need to trigger translation on this element (i.e. we have inline children in it)
export const PARAGRAPH_ATTRIBUTE = "data-plainly-paragraph"
export const BLOCK_ATTRIBUTE = "data-plainly-block-node"
export const INLINE_ATTRIBUTE = "data-plainly-inline-node"

export const TRANSLATION_MODE_ATTRIBUTE = "data-plainly-translation-mode"

export const MARK_ATTRIBUTES = new Set([WALKED_ATTRIBUTE, PARAGRAPH_ATTRIBUTE, BLOCK_ATTRIBUTE, INLINE_ATTRIBUTE])

export const NOTRANSLATE_CLASS = "notranslate"

export const REACT_SHADOW_HOST_CLASS = "plainly-react-shadow-host"

export const TRANSLATION_ERROR_CONTAINER_CLASS = "plainly-translation-error-container"
