export type GoalDimension = 'diet' | 'exercise' | 'water'

export const GOAL_DIMENSIONS: GoalDimension[] = ['diet', 'exercise', 'water']

export const GOAL_DIMENSION_LABELS: Record<GoalDimension, string> = {
  diet: '饮食',
  exercise: '运动',
  water: '喝水',
}
