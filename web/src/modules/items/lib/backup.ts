import type { SupabaseClient } from '@supabase/supabase-js'
import { toISODate } from '../../../shared/lib/date-utils'
import {
  toArea,
  toCategory,
  toItem,
  toUnit,
  type Area,
  type Category,
  type DbArea,
  type DbCategory,
  type DbItemRow,
  type DbUnit,
  type Item,
  type Unit,
} from './types'

export const BACKUP_VERSION = 3 as const
export const LEGACY_BACKUP_VERSION = 2 as const

export type BackupItem = Omit<Item, 'area' | 'category' | 'unit'>

export type BackupData = {
  version: typeof BACKUP_VERSION
  exportedAt: string
  areas: Area[]
  categories: Category[]
  units: Unit[]
  items: BackupItem[]
}

export type BackupValidationError =
  | 'invalidStructure'
  | 'invalidVersion'
  | 'invalidAreas'
  | 'invalidCategories'
  | 'invalidUnits'
  | 'invalidItems'

export type BackupValidationResult =
  | { ok: true; data: BackupData }
  | { ok: false; error: BackupValidationError }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || isNumber(value)
}

function validateEntity(value: unknown): value is Area | Category | Unit {
  if (!isRecord(value)) return false
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isBoolean(value.isSystemReserved) &&
    isNonEmptyString(value.createdAt)
  )
}

function validateBackupItem(value: unknown): value is BackupItem {
  if (!isRecord(value)) return false
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    isNumber(value.purchasePrice) &&
    (value.purchaseDate === undefined || isNonEmptyString(value.purchaseDate)) &&
    (value.quantity === undefined || isNullableNumber(value.quantity)) &&
    (value.unitId === undefined || isNullableString(value.unitId)) &&
    isNonEmptyString(value.startDate) &&
    isNullableString(value.endDate) &&
    isNullableString(value.expiryDate) &&
    isNonEmptyString(value.areaId) &&
    isNonEmptyString(value.categoryId) &&
    typeof value.specificLocation === 'string' &&
    isNonEmptyString(value.createdAt) &&
    isNonEmptyString(value.updatedAt)
  )
}

function normalizeLegacyItem(item: BackupItem & { purchaseDate?: string }): BackupItem {
  return {
    ...item,
    purchaseDate: item.purchaseDate ?? item.startDate,
    quantity: item.quantity ?? null,
    unitId: item.unitId ?? null,
  }
}

export function validateBackupData(data: unknown): BackupValidationResult {
  if (!isRecord(data)) {
    return { ok: false, error: 'invalidStructure' }
  }

  const version = data.version
  if (
    version !== BACKUP_VERSION &&
    version !== LEGACY_BACKUP_VERSION &&
    version !== 1
  ) {
    return { ok: false, error: 'invalidVersion' }
  }

  if (!isNonEmptyString(data.exportedAt)) {
    return { ok: false, error: 'invalidStructure' }
  }

  if (!Array.isArray(data.areas)) {
    return { ok: false, error: 'invalidAreas' }
  }

  if (!data.areas.every(validateEntity)) {
    return { ok: false, error: 'invalidAreas' }
  }

  if (!Array.isArray(data.categories)) {
    return { ok: false, error: 'invalidCategories' }
  }

  if (!data.categories.every(validateEntity)) {
    return { ok: false, error: 'invalidCategories' }
  }

  const units = version === BACKUP_VERSION ? data.units : []
  if (version === BACKUP_VERSION) {
    if (!Array.isArray(data.units)) {
      return { ok: false, error: 'invalidUnits' }
    }
    if (!data.units.every(validateEntity)) {
      return { ok: false, error: 'invalidUnits' }
    }
  }

  if (!Array.isArray(data.items)) {
    return { ok: false, error: 'invalidItems' }
  }

  if (!data.items.every(validateBackupItem)) {
    return { ok: false, error: 'invalidItems' }
  }

  return {
    ok: true,
    data: {
      version: BACKUP_VERSION,
      exportedAt: data.exportedAt,
      areas: data.areas as Area[],
      categories: data.categories as Category[],
      units: (units ?? []) as Unit[],
      items: (data.items as BackupItem[]).map(normalizeLegacyItem),
    },
  }
}

export function parseBackupJson(text: string): unknown {
  return JSON.parse(text) as unknown
}

export function getBackupFilename(date = new Date()): string {
  return `item-manage-backup-${toISODate(date).replace(/-/g, '')}.json`
}

function stripItemRelations(item: Item): BackupItem {
  const { area: _area, category: _category, unit: _unit, ...rest } = item
  return rest
}

function triggerDownload(filename: string, data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportBackup(client: SupabaseClient): Promise<BackupData> {
  const [areasResult, categoriesResult, unitsResult, itemsResult] =
    await Promise.all([
      client.from('areas').select('*').order('name'),
      client.from('categories').select('*').order('name'),
      client.from('units').select('*').order('name'),
      client.from('items').select('*').order('name'),
    ])

  if (areasResult.error) throw areasResult.error
  if (categoriesResult.error) throw categoriesResult.error
  if (unitsResult.error) throw unitsResult.error
  if (itemsResult.error) throw itemsResult.error

  const backup: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    areas: (areasResult.data as DbArea[]).map(toArea),
    categories: (categoriesResult.data as DbCategory[]).map(toCategory),
    units: (unitsResult.data as DbUnit[]).map(toUnit),
    items: (itemsResult.data as DbItemRow[]).map(toItem).map(stripItemRelations),
  }

  triggerDownload(getBackupFilename(), backup)
  return backup
}

function areaToDbRow(area: Area): DbArea {
  return {
    id: area.id,
    name: area.name,
    is_system_reserved: area.isSystemReserved,
    created_at: area.createdAt,
  }
}

function categoryToDbRow(category: Category): DbCategory {
  return {
    id: category.id,
    name: category.name,
    is_system_reserved: category.isSystemReserved,
    created_at: category.createdAt,
  }
}

function unitToDbRow(unit: Unit): DbUnit {
  return {
    id: unit.id,
    name: unit.name,
    is_system_reserved: unit.isSystemReserved,
    created_at: unit.createdAt,
  }
}

function itemToDbRow(item: BackupItem) {
  return {
    id: item.id,
    name: item.name,
    purchase_price: item.purchasePrice,
    purchase_date: item.purchaseDate,
    quantity: item.quantity,
    start_date: item.startDate,
    end_date: item.endDate,
    expiry_date: item.expiryDate,
    area_id: item.areaId,
    category_id: item.categoryId,
    unit_id: item.unitId,
    specific_location: item.specificLocation,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  }
}

export async function importBackup(
  client: SupabaseClient,
  data: BackupData,
): Promise<void> {
  const validation = validateBackupData(data)
  if (!validation.ok) {
    throw new Error(`备份文件无效：${validation.error}`)
  }

  const { error: deleteItemsError } = await client
    .from('items')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteItemsError) throw deleteItemsError

  const { error: deleteCategoriesError } = await client
    .from('categories')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteCategoriesError) throw deleteCategoriesError

  const { error: deleteAreasError } = await client
    .from('areas')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteAreasError) throw deleteAreasError

  const { error: deleteUnitsError } = await client
    .from('units')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteUnitsError) throw deleteUnitsError

  const { areas, categories, units, items } = validation.data

  if (areas.length > 0) {
    const { error } = await client
      .from('areas')
      .insert(areas.map(areaToDbRow))
    if (error) throw error
  }

  if (categories.length > 0) {
    const { error } = await client
      .from('categories')
      .insert(categories.map(categoryToDbRow))
    if (error) throw error
  }

  if (units.length > 0) {
    const { error } = await client.from('units').insert(units.map(unitToDbRow))
    if (error) throw error
  }

  if (items.length > 0) {
    const { error } = await client
      .from('items')
      .insert(items.map(itemToDbRow))
    if (error) throw error
  }
}
