// src/hooks/usePageTitle.ts
// Sets document.title on every page with proper format

import { useEffect } from 'react'

const SITE_NAME = 'PRAGATI-AI'

/**
 * Sets document.title on mount. Cleans up on unmount by restoring the base title.
 * Format: "Page Name — PRAGATI-AI"
 */
export function usePageTitle(pageTitle: string) {
  useEffect(() => {
    const prev = document.title
    document.title = `${pageTitle} — ${SITE_NAME}`
    return () => { document.title = prev }
  }, [pageTitle])
}
