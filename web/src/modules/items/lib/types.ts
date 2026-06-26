export type DbArea = {
  id: string
  name: string
  is_system_reserved: boolean
  created_at: string
}

export type DbCategory = {
  id: string
  name: string
  is_system_reserved: boolean
  created_at: string
}

export type DbUnit = {
  id: string
  name: string
  is_system_reserved: boolean
  created_at: string
}

export type DbItem = {
  id: string
  name: string
  purchase_price: number | string
  purchase_date: string
  quantity: number | string | null
  start_date: string
  end_date: string | null
  expiry_date: string | null
  area_id: string
  category_id: string
  unit_id: string | null
  specific_location: string
  created_at: string
  updated_at: string
}

export type DbItemRow = DbItem & {
  area?: DbArea | null
  category?: DbCategory | null
  unit?: DbUnit | null
}

export type Area = {
  id: string
  name: string
  isSystemReserved: boolean
  createdAt: string
}

export type Category = {
  id: string
  name: string
  isSystemReserved: boolean
  createdAt: string
}

export type Unit = {
  id: string
  name: string
  isSystemReserved: boolean
  createdAt: string
}

export type Item = {
  id: string
  name: string
  purchasePrice: number
  purchaseDate: string
  quantity: number | null
  startDate: string
  endDate: string | null
  expiryDate: string | null
  areaId: string
  categoryId: string
  unitId: string | null
  specificLocation: string
  createdAt: string
  updatedAt: string
  area?: Area
  category?: Category
  unit?: Unit
}

export type ItemInsert = Omit<
  Item,
  'id' | 'createdAt' | 'updatedAt' | 'area' | 'category' | 'unit'
>

export type ItemUpdateInput = Partial<ItemInsert>

export type DbAreaInsert = Pick<DbArea, 'name' | 'is_system_reserved'>
export type DbCategoryInsert = Pick<DbCategory, 'name' | 'is_system_reserved'>
export type DbUnitInsert = Pick<DbUnit, 'name' | 'is_system_reserved'>

export function toArea(row: DbArea): Area {
  return {
    id: row.id,
    name: row.name,
    isSystemReserved: row.is_system_reserved,
    createdAt: row.created_at,
  }
}

export function toCategory(row: DbCategory): Category {
  return {
    id: row.id,
    name: row.name,
    isSystemReserved: row.is_system_reserved,
    createdAt: row.created_at,
  }
}

export function toUnit(row: DbUnit): Unit {
  return {
    id: row.id,
    name: row.name,
    isSystemReserved: row.is_system_reserved,
    createdAt: row.created_at,
  }
}

function parsePurchasePrice(value: number | string): number {
  return typeof value === 'number' ? value : Number(value)
}

function parseQuantity(value: number | string | null | undefined): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : null
}

export function toItem(row: DbItemRow): Item {
  const item: Item = {
    id: row.id,
    name: row.name,
    purchasePrice: parsePurchasePrice(row.purchase_price),
    purchaseDate: row.purchase_date,
    quantity: parseQuantity(row.quantity),
    startDate: row.start_date,
    endDate: row.end_date,
    expiryDate: row.expiry_date,
    areaId: row.area_id,
    categoryId: row.category_id,
    unitId: row.unit_id,
    specificLocation: row.specific_location,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }

  if (row.area) {
    item.area = toArea(row.area)
  }
  if (row.category) {
    item.category = toCategory(row.category)
  }
  if (row.unit) {
    item.unit = toUnit(row.unit)
  }

  return item
}

export function toDbItem(
  item: ItemInsert | ItemUpdateInput,
): Partial<DbItem> {
  const row: Partial<DbItem> = {}

  if (item.name !== undefined) row.name = item.name
  if (item.purchasePrice !== undefined) {
    row.purchase_price = item.purchasePrice
  }
  if (item.purchaseDate !== undefined) row.purchase_date = item.purchaseDate
  if (item.startDate !== undefined) row.start_date = item.startDate
  if (item.endDate !== undefined) row.end_date = item.endDate
  if (item.expiryDate !== undefined) row.expiry_date = item.expiryDate
  if (item.areaId !== undefined) row.area_id = item.areaId
  if (item.categoryId !== undefined) row.category_id = item.categoryId
  if (item.quantity !== undefined) row.quantity = item.quantity
  if (item.unitId !== undefined) row.unit_id = item.unitId
  if (item.specificLocation !== undefined) {
    row.specific_location = item.specificLocation
  }

  return row
}
