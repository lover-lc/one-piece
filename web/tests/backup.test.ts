import { describe, expect, it } from 'vitest'
import {
  BACKUP_VERSION,
  getBackupFilename,
  parseBackupJson,
  validateBackupData,
  type BackupData,
} from '../src/modules/items/lib/backup'

const sampleBackup: BackupData = {
  version: BACKUP_VERSION,
  exportedAt: '2026-06-26T00:00:00.000Z',
  areas: [
    {
      id: 'area-1',
      name: '客厅',
      isSystemReserved: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  categories: [
    {
      id: 'category-1',
      name: '日用品',
      isSystemReserved: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  units: [
    {
      id: 'unit-1',
      name: '千克',
      isSystemReserved: false,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  items: [
    {
      id: 'item-1',
      name: '毛巾',
      purchasePrice: 29.9,
      purchaseDate: '2026-01-01',
      quantity: 2,
      startDate: '2026-01-01',
      endDate: null,
      expiryDate: null,
      areaId: 'area-1',
      categoryId: 'category-1',
      unitId: 'unit-1',
      specificLocation: '柜子上层',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z',
    },
  ],
}

describe('getBackupFilename', () => {
  it('uses YYYYMMDD format', () => {
    expect(getBackupFilename(new Date(2026, 5, 26))).toBe(
      'item-manage-backup-20260626.json',
    )
  })
})

describe('parseBackupJson', () => {
  it('parses valid JSON text', () => {
    expect(parseBackupJson(JSON.stringify(sampleBackup))).toEqual(sampleBackup)
  })
})

describe('validateBackupData', () => {
  it('accepts valid backup data', () => {
    expect(validateBackupData(sampleBackup)).toEqual({
      ok: true,
      data: sampleBackup,
    })
  })

  it('rejects invalid version', () => {
    expect(
      validateBackupData({ ...sampleBackup, version: 99 }),
    ).toEqual({ ok: false, error: 'invalidVersion' })
  })

  it('accepts legacy v2 backup without purchaseDate', () => {
    const legacy = {
      version: 2,
      exportedAt: sampleBackup.exportedAt,
      areas: sampleBackup.areas,
      categories: sampleBackup.categories,
      units: sampleBackup.units,
      items: sampleBackup.items.map(({ purchaseDate, ...item }) => item),
    }
    const result = validateBackupData(legacy)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.items[0]?.purchaseDate).toBe('2026-01-01')
    }
  })

  it('accepts legacy v1 backup without units', () => {
    const legacy = {
      version: 1,
      exportedAt: sampleBackup.exportedAt,
      areas: sampleBackup.areas,
      categories: sampleBackup.categories,
      items: sampleBackup.items.map(({ quantity, unitId, ...item }) => item),
    }
    const result = validateBackupData(legacy)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.units).toEqual([])
      expect(result.data.items[0]?.quantity).toBeNull()
      expect(result.data.items[0]?.unitId).toBeNull()
    }
  })

  it('rejects missing exportedAt', () => {
    expect(
      validateBackupData({ ...sampleBackup, exportedAt: '' }),
    ).toEqual({ ok: false, error: 'invalidStructure' })
  })

  it('rejects invalid areas array', () => {
    expect(
      validateBackupData({ ...sampleBackup, areas: [{ id: 'x' }] }),
    ).toEqual({ ok: false, error: 'invalidAreas' })
  })

  it('rejects invalid items array', () => {
    expect(
      validateBackupData({
        ...sampleBackup,
        items: [{ ...sampleBackup.items[0], purchasePrice: 'bad' }],
      }),
    ).toEqual({ ok: false, error: 'invalidItems' })
  })

  it('rejects non-object root', () => {
    expect(validateBackupData(null)).toEqual({
      ok: false,
      error: 'invalidStructure',
    })
  })
})
