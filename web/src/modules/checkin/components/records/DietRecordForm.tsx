import { useCallback, useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DateField, {
  isoFromDateField,
  type DateFieldValue,
} from '../../../../shared/components/DateField'
import AppMotionBottomSheet from '../../../../shared/components/motion/AppMotionBottomSheet'
import AppSegmentedControl from '../../../../shared/components/motion/AppSegmentedControl'
import { toISODate } from '../../../../shared/lib/date-utils'
import { composeLocalIso } from '../../../../shared/lib/datetime-utils'
import { cn } from '@/lib/utils'
import CheckinToast from '../CheckinToast'
import CheckinMotionBottomSheet from '../motion/CheckinMotionBottomSheet'
import {
  useFoodLibrary,
  useFoodPresets,
  useUpsertFoodPreset,
} from '../../hooks/use-food-library'
import type { FoodLibraryItem, FoodPreset } from '../../types/checkin-types'

type NutritionPer100g = {
  kcalPer100g: number
  proteinGPer100g: number
  fatGPer100g: number
  carbsGPer100g: number
}

type DietRecordFormValue = {
  foodId?: string | null
  name: string
  g: number
  mealType?: string | null
  recordedAt: string
  nutrition: {
    calories: number
    protein: number
    fat: number
    carbs: number
  }
}

type DietRecordFormProps = {
  open: boolean
  onClose: () => void
  memberId: string | null
  defaultRecordedAt?: Date
  onSubmit: (value: DietRecordFormValue) => Promise<void> | void
}

const MEAL_OPTIONS = [
  { id: '', name: '未设置' },
  { id: '早餐', name: '早餐' },
  { id: '午餐', name: '午餐' },
  { id: '晚餐', name: '晚餐' },
  { id: '加餐', name: '加餐' },
] as const

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function dateFieldFromDate(d: Date): DateFieldValue {
  const dateStr = toISODate(d)
  const time = format(d, 'HH:mm')
  return { iso: composeLocalIso(dateStr, time), hasTime: true }
}

function per100gFromFood(item: FoodLibraryItem | FoodPreset): NutritionPer100g | null {
  const kcal = item.kcalPer100g
  const protein = item.proteinGPer100g
  const fat = item.fatGPer100g
  const carbs = item.carbsGPer100g
  if (
    kcal == null ||
    protein == null ||
    fat == null ||
    carbs == null ||
    !Number.isFinite(kcal) ||
    !Number.isFinite(protein) ||
    !Number.isFinite(fat) ||
    !Number.isFinite(carbs)
  ) {
    return null
  }
  return {
    kcalPer100g: kcal,
    proteinGPer100g: protein,
    fatGPer100g: fat,
    carbsGPer100g: carbs,
  }
}

function SelectableList({
  items,
  selectedId,
  onSelect,
  loading,
  emptyMessage,
  getLabel,
}: {
  items: { id: string }[]
  selectedId: string
  onSelect: (id: string) => void
  loading?: boolean
  emptyMessage: string
  getLabel: (item: { id: string }) => string
}) {
  return (
    <div className="max-h-48 overflow-y-auto rounded-md border border-border">
      {loading ? (
        <p className="p-3 text-sm text-muted-foreground">加载中…</p>
      ) : items.length === 0 ? (
        <p className="p-3 text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              'block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
              selectedId === item.id && 'bg-primary/10 font-medium text-foreground',
            )}
            onClick={() => onSelect(item.id)}
          >
            {getLabel(item)}
          </button>
        ))
      )}
    </div>
  )
}

export default function DietRecordForm({
  open,
  onClose,
  memberId,
  defaultRecordedAt,
  onSubmit,
}: DietRecordFormProps) {
  const [librarySearch, setLibrarySearch] = useState('')
  const [presetSearch, setPresetSearch] = useState('')
  const { data: library = [], isLoading: libraryLoading } = useFoodLibrary(librarySearch)
  const { data: presets = [] } = useFoodPresets(memberId ?? undefined)
  const upsertPreset = useUpsertFoodPreset()

  const [source, setSource] = useState<'preset' | 'library' | 'custom'>('preset')
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>('')

  const [customName, setCustomName] = useState('')
  const [customKcal, setCustomKcal] = useState<string>('')
  const [customProtein, setCustomProtein] = useState<string>('')
  const [customFat, setCustomFat] = useState<string>('')
  const [customCarbs, setCustomCarbs] = useState<string>('')

  const [grams, setGrams] = useState<string>('100')
  const [mealType, setMealType] = useState<string>('')
  const [mealSheetOpen, setMealSheetOpen] = useState(false)
  const [recordedAtField, setRecordedAtField] = useState<DateFieldValue>({
    iso: null,
    hasTime: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    if (!open) return
    const d = defaultRecordedAt ?? new Date()
    setRecordedAtField(dateFieldFromDate(d))
    setError(null)
    setSubmitting(false)
    setToast(null)
    setLibrarySearch('')
    setPresetSearch('')
    setSource('preset')
    setSelectedPresetId('')
    setSelectedLibraryId('')
    setCustomName('')
    setCustomKcal('')
    setCustomProtein('')
    setCustomFat('')
    setCustomCarbs('')
    setGrams('100')
    setMealType('')
    setMealSheetOpen(false)
  }, [open, defaultRecordedAt])

  const filteredPresets = useMemo(() => {
    const q = presetSearch.trim().toLowerCase()
    if (!q) return presets
    return presets.filter((p) => (p.name ?? '').toLowerCase().includes(q))
  }, [presets, presetSearch])

  const selectedPreset = useMemo(
    () => presets.find((p) => p.id === selectedPresetId) ?? null,
    [presets, selectedPresetId],
  )
  const selectedLibrary = useMemo(
    () => library.find((f) => f.id === selectedLibraryId) ?? null,
    [library, selectedLibraryId],
  )

  const per100g = useMemo(() => {
    if (source === 'preset') return selectedPreset ? per100gFromFood(selectedPreset) : null
    if (source === 'library') return selectedLibrary ? per100gFromFood(selectedLibrary) : null
    const kcal = Number(customKcal || NaN)
    const protein = Number(customProtein || NaN)
    const fat = Number(customFat || NaN)
    const carbs = Number(customCarbs || NaN)
    if (![kcal, protein, fat, carbs].every((n) => Number.isFinite(n))) return null
    return {
      kcalPer100g: kcal,
      proteinGPer100g: protein,
      fatGPer100g: fat,
      carbsGPer100g: carbs,
    }
  }, [
    source,
    selectedPreset,
    selectedLibrary,
    customKcal,
    customProtein,
    customFat,
    customCarbs,
  ])

  const gramsValue = useMemo(() => {
    const g = Number(grams)
    return Number.isFinite(g) && g > 0 ? g : null
  }, [grams])

  const nutrition = useMemo(() => {
    if (!per100g || !gramsValue) return null
    const factor = gramsValue / 100
    return {
      calories: Math.round(per100g.kcalPer100g * factor),
      protein: round1(per100g.proteinGPer100g * factor),
      fat: round1(per100g.fatGPer100g * factor),
      carbs: round1(per100g.carbsGPer100g * factor),
    }
  }, [per100g, gramsValue])

  const displayName = useMemo(() => {
    if (source === 'preset') return selectedPreset?.name ?? ''
    if (source === 'library') return selectedLibrary?.name ?? ''
    return customName
  }, [source, selectedPreset, selectedLibrary, customName])

  const mealLabel =
    MEAL_OPTIONS.find((o) => o.id === mealType)?.name ?? '未设置'

  async function handleAddToPreset() {
    setError(null)
    if (!memberId) {
      setError('请先选择成员')
      return
    }
    const name = customName.trim()
    if (!name) {
      setError('请填写食物名称')
      return
    }
    const kcal = Number(customKcal || NaN)
    const protein = Number(customProtein || NaN)
    const fat = Number(customFat || NaN)
    const carbs = Number(customCarbs || NaN)
    if (![kcal, protein, fat, carbs].every((n) => Number.isFinite(n))) {
      setError('请补全每 100g 的营养信息')
      return
    }

    const existing = presets.find((p) => (p.name ?? '').trim() === name)

    try {
      await upsertPreset.mutateAsync({
        id: existing?.id,
        memberId,
        name,
        kcalPer100g: kcal,
        proteinGPer100g: protein,
        fatGPer100g: fat,
        carbsGPer100g: carbs,
        sortOrder: existing?.sortOrder ?? presets.length,
      })
      setToast('添加成功')
    } catch (err) {
      setError(String((err as Error).message || '添加预设失败'))
    }
  }

  async function handleSubmit() {
    setError(null)
    const recordedAt = isoFromDateField(recordedAtField, false)
    if (!memberId) {
      setError('请先选择成员')
      return
    }
    if (!recordedAt) {
      setError('请选择记录时间')
      return
    }
    if (!displayName.trim()) {
      setError('请填写食物名称')
      return
    }
    if (!gramsValue) {
      setError('请输入克数（g）')
      return
    }
    if (!nutrition) {
      setError('请补全每 100g 的营养信息')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        foodId:
          source === 'library'
            ? selectedLibrary?.id ?? null
            : source === 'preset'
              ? selectedPreset?.foodLibraryId ?? null
              : null,
        name: displayName.trim(),
        g: gramsValue,
        mealType: mealType || null,
        recordedAt,
        nutrition,
      })
      onClose()
    } catch (err) {
      setError(String((err as Error).message || '提交失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <CheckinMotionBottomSheet open={open} onClose={onClose} title="饮食">
        <div className="space-y-3 p-4">
          <AppSegmentedControl
            aria-label="食物来源"
            className="rounded-md bg-muted/60"
            size="xs"
            layoutIdPrefix="diet-source"
            options={[
              { value: 'preset' as const, label: '预设' },
              { value: 'library' as const, label: '搜索' },
              { value: 'custom' as const, label: '自定义' },
            ]}
            value={source}
            onChange={setSource}
          />

          {source === 'preset' ? (
            <div className="space-y-2">
              <Input
                value={presetSearch}
                onChange={(e) => setPresetSearch(e.target.value)}
                placeholder="搜索预设"
                disabled={!memberId}
              />
              <SelectableList
                items={filteredPresets}
                selectedId={selectedPresetId}
                onSelect={setSelectedPresetId}
                emptyMessage={
                  !memberId
                    ? '请先选择成员'
                    : presets.length === 0
                      ? '暂无预设'
                      : presetSearch.trim()
                        ? '无匹配'
                        : '暂无预设'
                }
                getLabel={(item) =>
                  presets.find((p) => p.id === item.id)?.name ?? '未命名'
                }
              />
            </div>
          ) : null}

          {source === 'library' ? (
            <div className="space-y-2">
              <Input
                value={librarySearch}
                onChange={(e) => setLibrarySearch(e.target.value)}
                placeholder="例如 鸡胸肉"
              />
              <SelectableList
                items={library}
                selectedId={selectedLibraryId}
                onSelect={setSelectedLibraryId}
                loading={libraryLoading}
                emptyMessage={
                  librarySearch.trim() ? '无匹配' : '输入关键词搜索'
                }
                getLabel={(item) =>
                  library.find((f) => f.id === item.id)?.name ?? ''
                }
              />
            </div>
          ) : null}

          {source === 'custom' ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="customName">食物名称</Label>
                <Input
                  id="customName"
                  className="mt-1"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="例如 自制沙拉"
                />
              </div>
              <p className="text-xs font-medium text-muted-foreground">每 100g</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="customKcal">热量（kcal）</Label>
                  <Input
                    id="customKcal"
                    className="mt-1"
                    inputMode="decimal"
                    value={customKcal}
                    onChange={(e) => setCustomKcal(e.target.value)}
                    placeholder="120"
                  />
                </div>
                <div>
                  <Label htmlFor="customProtein">蛋白质（g）</Label>
                  <Input
                    id="customProtein"
                    className="mt-1"
                    inputMode="decimal"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    placeholder="20"
                  />
                </div>
                <div>
                  <Label htmlFor="customFat">脂肪（g）</Label>
                  <Input
                    id="customFat"
                    className="mt-1"
                    inputMode="decimal"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    placeholder="5"
                  />
                </div>
                <div>
                  <Label htmlFor="customCarbs">碳水（g）</Label>
                  <Input
                    id="customCarbs"
                    className="mt-1"
                    inputMode="decimal"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    placeholder="10"
                  />
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={upsertPreset.isPending}
                onClick={() => void handleAddToPreset()}
              >
                {upsertPreset.isPending ? '保存中…' : '添加到预设'}
              </Button>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="grams">克数（g）</Label>
              <Input
                id="grams"
                className="mt-1"
                inputMode="decimal"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                placeholder="150"
              />
            </div>
            <div>
              <Label>餐次（可选）</Label>
              <button
                type="button"
                onClick={() => setMealSheetOpen(true)}
                className="mt-1 flex w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm"
              >
                <span className={mealType ? 'text-foreground' : 'text-muted-foreground'}>
                  {mealLabel}
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div>
            <Label className="mb-1 block">记录时间</Label>
            <DateField
              value={recordedAtField}
              onChange={setRecordedAtField}
              showTime
              allowClear={false}
              placeholder="选择时间"
            />
          </div>

          <div className="rounded-md border border-border bg-card/50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">热量</span>
              <span className="font-medium">
                {nutrition ? `${nutrition.calories} kcal` : '—'}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              <span>蛋白质：{nutrition ? `${nutrition.protein}g` : '—'}</span>
              <span>脂肪：{nutrition ? `${nutrition.fat}g` : '—'}</span>
              <span>碳水：{nutrition ? `${nutrition.carbs}g` : '—'}</span>
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="button"
            className="w-full"
            onClick={() => void handleSubmit()}
            disabled={submitting}
          >
            {submitting ? '提交中…' : '保存记录'}
          </Button>
        </div>
      </CheckinMotionBottomSheet>

      <AppMotionBottomSheet
        open={mealSheetOpen}
        onClose={() => setMealSheetOpen(false)}
        title="餐次"
      >
        <ul className="max-h-[50svh] overflow-y-auto">
          {MEAL_OPTIONS.map((opt) => (
            <li key={opt.id || 'unset'}>
              <button
                type="button"
                onClick={() => {
                  setMealType(opt.id)
                  setMealSheetOpen(false)
                }}
                className={cn(
                  'flex w-full px-4 py-3 text-left text-sm hover:bg-muted',
                  mealType === opt.id ? 'font-medium text-primary' : 'text-foreground',
                )}
              >
                {opt.name}
              </button>
            </li>
          ))}
        </ul>
      </AppMotionBottomSheet>

      <CheckinToast message={toast} onDismiss={dismissToast} />
    </>
  )
}
