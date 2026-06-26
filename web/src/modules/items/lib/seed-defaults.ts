export const DEFAULT_AREAS = ['客厅', '卧室', '厨房', '卫生间', '储藏室']
export const DEFAULT_CATEGORIES = ['日用品', '食品', '宠物用品', '清洁用品']

export const SYSTEM_RESERVED_NAME = '未分类'

export function buildDefaultAreaRows() {
  return [
    ...DEFAULT_AREAS.map((name) => ({
      name,
      is_system_reserved: false,
    })),
    {
      name: SYSTEM_RESERVED_NAME,
      is_system_reserved: true,
    },
  ]
}

export function buildDefaultCategoryRows() {
  return [
    ...DEFAULT_CATEGORIES.map((name) => ({
      name,
      is_system_reserved: false,
    })),
    {
      name: SYSTEM_RESERVED_NAME,
      is_system_reserved: true,
    },
  ]
}
