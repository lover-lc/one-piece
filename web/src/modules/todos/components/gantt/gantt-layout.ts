import { createContext, useContext } from 'react'

export const GANTT_LABEL_WIDTH = 96
export const GANTT_LABEL_WIDTH_FULLSCREEN = 168
export const GANTT_ROW_HEIGHT = 32

export const GanttFullscreenContext = createContext(false)

export function useGanttLabelWidth(): number {
  const isFullscreen = useContext(GanttFullscreenContext)
  return isFullscreen ? GANTT_LABEL_WIDTH_FULLSCREEN : GANTT_LABEL_WIDTH
}
