import { useCallback, useState } from 'react'
import {
  isValidGanttRangeFilter,
  type GanttGranularity,
  type GanttRange,
} from '../lib/gantt-scale'

const STORAGE_KEY = 'todo-gantt-prefs'

export type GanttPrefs = {
  granularity: GanttGranularity
  rangeStart: string
  rangeEnd: string
}

const VALID_GRANULARITIES = new Set<GanttGranularity>(['day', 'week', 'month'])

const EMPTY_RANGE = { rangeStart: '', rangeEnd: '' }

function normalizeStoredRange(start: unknown, end: unknown): { start: string; end: string } {
  const asString = (value: unknown) => (typeof value === 'string' ? value : '')
  return {
    start: asString(start),
    end: asString(end),
  }
}

function defaultPrefs(granularity: GanttGranularity = 'day'): GanttPrefs {
  return { granularity, ...EMPTY_RANGE }
}

function readStoredPrefs(): GanttPrefs {
  if (typeof window === 'undefined') {
    return defaultPrefs()
  }

  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    const prefs = defaultPrefs()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    return prefs
  }

  try {
    const parsed = JSON.parse(raw) as Partial<GanttPrefs>
    const granularity = VALID_GRANULARITIES.has(parsed.granularity as GanttGranularity)
      ? (parsed.granularity as GanttGranularity)
      : 'day'

    const { start: rangeStart, end: rangeEnd } = normalizeStoredRange(
      parsed.rangeStart,
      parsed.rangeEnd,
    )

    if (isValidGanttRangeFilter(rangeStart, rangeEnd)) {
      return { granularity, rangeStart, rangeEnd }
    }

    const prefs = defaultPrefs(granularity)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    return prefs
  } catch {
    const prefs = defaultPrefs()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
    return prefs
  }
}

function writePrefs(prefs: GanttPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
}

export function useGanttPrefs() {
  const [prefs, setPrefsState] = useState<GanttPrefs>(readStoredPrefs)

  const setGranularity = useCallback((granularity: GanttGranularity) => {
    setPrefsState((prev) => {
      const next = { ...prev, granularity }
      writePrefs(next)
      return next
    })
  }, [])

  const setRange = useCallback((range: GanttRange) => {
    const cleared = range.start === '' && range.end === ''
    if (!cleared && !isValidGanttRangeFilter(range.start, range.end)) return
    setPrefsState((prev) => {
      const next = { ...prev, rangeStart: range.start, rangeEnd: range.end }
      writePrefs(next)
      return next
    })
  }, [])

  const range: GanttRange = { start: prefs.rangeStart, end: prefs.rangeEnd }

  return {
    granularity: prefs.granularity,
    rangeStart: prefs.rangeStart,
    rangeEnd: prefs.rangeEnd,
    range,
    setGranularity,
    setRange,
  }
}
