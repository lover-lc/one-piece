import { registerSW } from 'virtual:pwa-register'

export type PwaUpdatePhase = 'idle' | 'checking' | 'downloading' | 'applying' | 'reloading'

export type PwaUpdateState = {
  phase: PwaUpdatePhase
  progress: number
}

const UPDATE_LOCK_KEY = 'pwa-update-in-progress'
const UPDATE_LOCK_TTL_MS = 60_000
const DOM_OVERLAY_ID = '__pwa_update_overlay__'

type Listener = (state: PwaUpdateState) => void

let listeners: Listener[] = []
let currentState: PwaUpdateState = { phase: 'idle', progress: 0 }
let updateFlowRunning = false

function hasRecentUpdateLock(): boolean {
  try {
    const raw = sessionStorage.getItem(UPDATE_LOCK_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (!Number.isFinite(ts)) return true
    return Date.now() - ts < UPDATE_LOCK_TTL_MS
  } catch {
    return false
  }
}

function setUpdateLock() {
  try {
    sessionStorage.setItem(UPDATE_LOCK_KEY, String(Date.now()))
  } catch {
    // Ignore storage errors; lock is best-effort.
  }
}

function clearUpdateLock() {
  try {
    sessionStorage.removeItem(UPDATE_LOCK_KEY)
  } catch {
    // Ignore.
  }
}

function ensureDomOverlay(): HTMLElement | null {
  if (typeof document === 'undefined') return null
  if (import.meta.env.DEV) return null

  const existing = document.getElementById(DOM_OVERLAY_ID)
  if (existing) return existing

  const root = document.createElement('div')
  root.id = DOM_OVERLAY_ID
  root.style.position = 'fixed'
  root.style.inset = '0'
  root.style.zIndex = '999999'
  root.style.display = 'none'
  root.style.alignItems = 'center'
  root.style.justifyContent = 'center'
  root.style.background = 'rgba(0,0,0,0.55)'
  root.style.backdropFilter = 'blur(8px)'
  root.style.setProperty('-webkit-backdrop-filter', 'blur(8px)')
  root.style.padding = '24px'

  root.innerHTML = `
    <div style="
      width: 100%;
      max-width: 320px;
      background: rgba(255,255,255,0.92);
      border: 1px solid rgba(0,0,0,0.08);
      border-radius: 16px;
      padding: 18px 16px;
      box-shadow: 0 18px 60px rgba(0,0,0,0.18);
      font: 500 14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      color: rgba(0,0,0,0.88);
      text-align: center;
    ">
      <div data-pwa-label style="margin-bottom: 12px;">正在更新…</div>
      <div style="height: 6px; width: 100%; border-radius: 999px; overflow: hidden; background: rgba(0,0,0,0.08);">
        <div data-pwa-bar style="height: 100%; width: 0%; background: rgba(0,0,0,0.82); transition: width 240ms ease-out;"></div>
      </div>
      <div data-pwa-pct style="margin-top: 10px; font-size: 12px; color: rgba(0,0,0,0.55);">0%</div>
    </div>
  `

  document.body.appendChild(root)
  return root
}

function renderDomOverlay(state: PwaUpdateState) {
  const root = ensureDomOverlay()
  if (!root) return

  if (state.phase === 'idle') {
    root.style.display = 'none'
    return
  }

  root.style.display = 'flex'
  const label =
    state.phase === 'checking'
      ? '正在检查更新…'
      : state.phase === 'downloading'
        ? '正在下载新版本…'
        : state.phase === 'applying'
          ? '正在应用更新…'
          : '即将完成…'

  const labelEl = root.querySelector('[data-pwa-label]') as HTMLElement | null
  const barEl = root.querySelector('[data-pwa-bar]') as HTMLElement | null
  const pctEl = root.querySelector('[data-pwa-pct]') as HTMLElement | null
  if (labelEl) labelEl.textContent = label
  const pct = Math.round(Math.min(100, Math.max(0, state.progress)))
  if (barEl) barEl.style.width = `${pct}%`
  if (pctEl) pctEl.textContent = `${pct}%`
}

function emit(state: PwaUpdateState) {
  currentState = state
  renderDomOverlay(state)
  for (const listener of listeners) listener(state)
}

export function subscribePwaUpdate(listener: Listener): () => void {
  listeners.push(listener)
  listener(currentState)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

async function animateProgress(from: number, to: number, durationMs: number) {
  const start = performance.now()
  while (true) {
    const elapsed = performance.now() - start
    const ratio = Math.min(1, elapsed / durationMs)
    emit({
      phase: currentState.phase,
      progress: from + (to - from) * ratio,
    })
    if (ratio >= 1) break
    await sleep(32)
  }
}

async function runUpdateFlow() {
  if (updateFlowRunning) return
  if (hasRecentUpdateLock()) return

  updateFlowRunning = true
  setUpdateLock()

  try {
    emit({ phase: 'checking', progress: 0 })
    await animateProgress(0, 15, 400)

    emit({ phase: 'downloading', progress: 15 })
    await animateProgress(15, 70, 800)

    emit({ phase: 'applying', progress: 70 })
    await animateProgress(70, 95, 500)

    emit({ phase: 'reloading', progress: 95 })
    await animateProgress(95, 100, 300)

    clearUpdateLock()
    window.location.reload()
  } catch {
    clearUpdateLock()
    updateFlowRunning = false
    emit({ phase: 'idle', progress: 0 })
  }
}

async function checkRemoteVersion(registration?: ServiceWorkerRegistration) {
  if (import.meta.env.DEV) return

  try {
    const response = await fetch(
      `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`,
      { cache: 'no-store' },
    )
    if (!response.ok) return

    const data = (await response.json()) as { version?: string }
    if (data.version && data.version !== __APP_VERSION__) {
      void registration?.update().catch(() => {})
      void runUpdateFlow()
    }
  } catch {
    // Offline or transient network errors should not block app usage.
  }
}

function scheduleUpdateChecks(registration: ServiceWorkerRegistration) {
  const check = () => {
    void registration.update().catch(() => {})
    void checkRemoteVersion(registration)
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') check()
  })
  window.addEventListener('focus', check)
  window.setInterval(check, 60 * 60 * 1000)
}

export function initPwaUpdate() {
  if (import.meta.env.DEV) return

  registerSW({
    immediate: true,
    onNeedReload() {
      void runUpdateFlow()
    },
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        scheduleUpdateChecks(registration)
        void checkRemoteVersion(registration)
      }
    },
  })
}
