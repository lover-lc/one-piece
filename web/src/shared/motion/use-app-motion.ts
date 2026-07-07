import { useReducedMotion } from 'framer-motion'
import { APP_MOTION, INSTANT, type AppMotionPreset } from './app-motion'

export function useAppMotion(): AppMotionPreset & {
  reducedMotion: boolean
  spring: AppMotionPreset['spring']
  gentle: AppMotionPreset['gentle']
  sheetSpring: AppMotionPreset['sheetSpring']
} {
  const reducedMotion = useReducedMotion() ?? false
  const preset = APP_MOTION

  return {
    ...preset,
    reducedMotion,
    spring: reducedMotion ? INSTANT : preset.spring,
    gentle: reducedMotion ? INSTANT : preset.gentle,
    sheetSpring: reducedMotion ? INSTANT : preset.sheetSpring,
  }
}
