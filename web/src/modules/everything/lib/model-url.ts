export function normalizeModelRef(modelRef: string): string {
  const trimmed = modelRef.trim()

  // If it's already an absolute URL, keep it.
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  // Normalize leading slash.
  let p = trimmed.replace(/^\//, '')

  // Handle accidental base-included paths like `one-piece/models/...`.
  p = p.replace(/^one-piece\//, '')

  // Legacy: old folder `models/` → new `everything-models/`.
  if (p.startsWith('models/')) {
    p = p.replace(/^models\//, 'everything-models/')
  }

  return p
}

export function resolveModelUrl(modelRef: string): string {
  const normalized = normalizeModelRef(modelRef)
  const basePath = import.meta.env.BASE_URL || '/'
  const absoluteBase =
    typeof window !== 'undefined'
      ? `${window.location.origin}${basePath.startsWith('/') ? '' : '/'}${basePath}`
      : `http://localhost${basePath.startsWith('/') ? '' : '/'}${basePath}`

  return new URL(normalized, absoluteBase).toString()
}

