import { ChevronRight, Plus } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Sheet from '../../../shared/components/ui/Sheet'
import { useAreas, useCreateArea } from '../hooks/use-areas'
import { useCategories, useCreateCategory } from '../hooks/use-categories'
import { useCreateItem, useItem, useUpdateItem } from '../hooks/use-items'
import { useCreateUnit, useUnits } from '../hooks/use-units'
import { parseISODate, toISODate } from '../../../shared/lib/date-utils'
import {
  parsePrice,
  parseQuantity,
  validateItemForm,
  validationErrorMessage,
} from '../lib/validators'

const fieldInputClass =
  'w-full rounded-button border border-bg-hover bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary'

const dateInputClass =
  'rounded-button border border-bg-hover bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-primary'

function FormSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-card bg-bg-card">
      <h2 className="px-4 pt-3 pb-1.5 text-sm font-medium text-text-secondary">{title}</h2>
      <div className="divide-y divide-bg-hover">{children}</div>
    </section>
  )
}

function FormRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="px-4 py-2.5">
      <label className="mb-1 block text-xs text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

function FormRowGrid({
  columns = 2,
  children,
}: {
  columns?: 2 | 3
  children: ReactNode
}) {
  return (
    <div
      className={[
        'grid divide-x divide-bg-hover',
        columns === 3 ? 'grid-cols-3' : 'grid-cols-2',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function FormField({
  label,
  children,
  compact = false,
}: {
  label: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div className={compact ? 'px-2 py-2.5' : 'px-4 py-2.5'}>
      <label className="mb-1 block text-xs text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

function DateInputRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <label className="shrink-0 text-sm text-text-secondary">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={dateInputClass}
      />
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-text">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-bg-hover'
        }`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

function PickerButton({
  value,
  placeholder,
  onClick,
  compact = false,
}: {
  value: string | null
  placeholder: string
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full min-w-0 items-center justify-between rounded-button border border-bg-hover bg-bg text-left text-sm',
        compact ? 'gap-0.5 px-2 py-2' : 'px-3 py-2',
      ].join(' ')}
    >
      <span
        className={[
          'truncate',
          value ? 'text-text' : 'text-text-tertiary',
        ].join(' ')}
      >
        {value ?? placeholder}
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-tertiary" />
    </button>
  )
}

function QuickAddSheet({
  open,
  title,
  placeholder,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  title: string
  placeholder: string
  onClose: () => void
  onSubmit: (name: string) => void
  isPending: boolean
}) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="w-full rounded-button border border-bg-hover bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-button px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-button bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? '添加中…' : '添加'}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function OptionSheet({
  open,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  onAddNew,
  addLabel,
}: {
  open: boolean
  title: string
  options: { id: string; name: string }[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClose: () => void
  onAddNew: () => void
  addLabel: string
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <ul className="max-h-[50svh] overflow-y-auto">
        {options.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              onClick={() => {
                onSelect(opt.id)
                onClose()
              }}
              className={`flex w-full px-4 py-3 text-left text-sm hover:bg-bg-hover ${
                selectedId === opt.id ? 'font-medium text-primary' : 'text-text'
              }`}
            >
              {opt.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t border-bg-hover p-4">
        <button
          type="button"
          onClick={() => {
            onClose()
            onAddNew()
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-button py-2.5 text-sm text-primary hover:bg-bg-hover"
        >
          <Plus className="size-4" />
          {addLabel}
        </button>
      </div>
    </Sheet>
  )
}

export default function ItemFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  const { data: existingItem, isLoading: itemLoading } = useItem(id)
  const { data: areas = [] } = useAreas()
  const { data: categories = [] } = useCategories()
  const { data: units = [] } = useUnits()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()
  const createArea = useCreateArea()
  const createCategory = useCreateCategory()
  const createUnit = useCreateUnit()

  const selectableAreas = useMemo(
    () => areas.filter((a) => !a.isSystemReserved),
    [areas],
  )
  const selectableCategories = useMemo(
    () => categories.filter((c) => !c.isSystemReserved),
    [categories],
  )

  const todayIso = toISODate(new Date())

  const [name, setName] = useState('')
  const [priceText, setPriceText] = useState('')
  const [quantityText, setQuantityText] = useState('')
  const [unitId, setUnitId] = useState<string | null>(null)
  const [areaId, setAreaId] = useState<string | null>(null)
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [specificLocation, setSpecificLocation] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(todayIso)
  const [startDate, setStartDate] = useState(todayIso)
  const [hasEndDate, setHasEndDate] = useState(false)
  const [endDate, setEndDate] = useState(todayIso)
  const [hasExpiryDate, setHasExpiryDate] = useState(false)
  const [expiryDate, setExpiryDate] = useState(todayIso)
  const [initialized, setInitialized] = useState(false)

  const [areaSheetOpen, setAreaSheetOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [unitSheetOpen, setUnitSheetOpen] = useState(false)
  const [newAreaSheetOpen, setNewAreaSheetOpen] = useState(false)
  const [newCategorySheetOpen, setNewCategorySheetOpen] = useState(false)
  const [newUnitSheetOpen, setNewUnitSheetOpen] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (!isEdit || !existingItem || initialized) return
    setName(existingItem.name)
    setPriceText(String(existingItem.purchasePrice))
    setQuantityText(
      existingItem.quantity != null ? String(existingItem.quantity) : '',
    )
    setUnitId(existingItem.unitId)
    setAreaId(existingItem.areaId)
    setCategoryId(existingItem.categoryId)
    setSpecificLocation(existingItem.specificLocation)
    setPurchaseDate(existingItem.purchaseDate)
    setStartDate(existingItem.startDate)
    setHasEndDate(existingItem.endDate != null)
    setEndDate(existingItem.endDate ?? todayIso)
    setHasExpiryDate(existingItem.expiryDate != null)
    setExpiryDate(existingItem.expiryDate ?? todayIso)
    setInitialized(true)
  }, [isEdit, existingItem, initialized, todayIso])

  const selectedAreaName =
    selectableAreas.find((a) => a.id === areaId)?.name ??
    areas.find((a) => a.id === areaId)?.name ??
    null
  const selectedCategoryName =
    selectableCategories.find((c) => c.id === categoryId)?.name ??
    categories.find((c) => c.id === categoryId)?.name ??
    null
  const selectedUnitName =
    units.find((u) => u.id === unitId)?.name ?? null

  const isSaving = createItem.isPending || updateItem.isPending

  async function handleSave() {
    const error = validateItemForm({
      name,
      priceText,
      quantityText,
      unitId,
      areaId,
      categoryId,
      purchaseDate: parseISODate(purchaseDate),
      startDate: parseISODate(startDate),
      endDate: hasEndDate ? parseISODate(endDate) : null,
    })

    if (error) {
      setValidationError(validationErrorMessage(error))
      return
    }

    const price = parsePrice(priceText)
    if (price === null || !areaId || !categoryId) return

    const quantity = parseQuantity(quantityText)

    const payload = {
      name: name.trim(),
      purchasePrice: price,
      purchaseDate,
      quantity,
      unitId: quantity != null ? unitId : null,
      areaId,
      categoryId,
      specificLocation: specificLocation.trim(),
      startDate,
      endDate: hasEndDate ? endDate : null,
      expiryDate: hasExpiryDate ? expiryDate : null,
    }

    try {
      if (isEdit && id) {
        await updateItem.mutateAsync({ id, ...payload })
      } else {
        await createItem.mutateAsync(payload)
      }
      navigate(-1)
    } catch {
      setValidationError('保存失败，请稍后重试')
    }
  }

  async function handleAddArea(name: string) {
    const area = await createArea.mutateAsync({ name })
    setAreaId(area.id)
    setNewAreaSheetOpen(false)
  }

  async function handleAddCategory(name: string) {
    const category = await createCategory.mutateAsync({ name })
    setCategoryId(category.id)
    setNewCategorySheetOpen(false)
  }

  async function handleAddUnit(name: string) {
    const unit = await createUnit.mutateAsync({ name })
    setUnitId(unit.id)
    setNewUnitSheetOpen(false)
  }

  if (isEdit && itemLoading) {
    return (
      <div className="min-h-svh bg-bg">
        <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
          <h1 className="text-center text-lg font-medium text-text">编辑物品</h1>
        </header>
        <p className="py-12 text-center text-sm text-text-secondary">加载中…</p>
      </div>
    )
  }

  if (isEdit && !itemLoading && !existingItem) {
    return (
      <div className="min-h-svh bg-bg">
        <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
          <h1 className="text-center text-lg font-medium text-text">编辑物品</h1>
        </header>
        <p className="py-12 text-center text-sm text-text-secondary">物品不存在</p>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-bg pb-8">
      <header className="sticky top-0 z-10 border-b border-bg-hover bg-bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-primary"
          >
            取消
          </button>
          <h1 className="text-lg font-medium text-text">
            {isEdit ? '编辑物品' : '添加物品'}
          </h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="text-sm font-medium text-primary disabled:opacity-50"
          >
            {isSaving ? '保存中…' : '保存'}
          </button>
        </div>
      </header>

      <div className="space-y-3 px-4 py-3">
        <FormSection title="基本信息">
          <FormRow label="物品名称">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="物品名称"
              className={fieldInputClass}
            />
          </FormRow>
          <FormRowGrid columns={3}>
            <FormField label="价格" compact>
              <input
                type="text"
                inputMode="decimal"
                value={priceText}
                onChange={(e) => setPriceText(e.target.value)}
                placeholder="0"
                className={fieldInputClass}
              />
            </FormField>
            <FormField label="数量" compact>
              <input
                type="text"
                inputMode="decimal"
                value={quantityText}
                onChange={(e) => setQuantityText(e.target.value)}
                placeholder="选填"
                className={fieldInputClass}
              />
            </FormField>
            <FormField label="单位" compact>
              <PickerButton
                value={selectedUnitName}
                placeholder="选填"
                compact
                onClick={() => setUnitSheetOpen(true)}
              />
            </FormField>
          </FormRowGrid>
        </FormSection>

        <FormSection title="位置与分类">
          <FormRowGrid>
            <FormField label="区域">
              <PickerButton
                value={selectedAreaName}
                placeholder="请选择"
                onClick={() => setAreaSheetOpen(true)}
              />
            </FormField>
            <FormField label="分类">
              <PickerButton
                value={selectedCategoryName}
                placeholder="请选择"
                onClick={() => setCategorySheetOpen(true)}
              />
            </FormField>
          </FormRowGrid>
          <FormRow label="具体位置">
            <input
              type="text"
              value={specificLocation}
              onChange={(e) => setSpecificLocation(e.target.value)}
              placeholder="具体位置"
              className={fieldInputClass}
            />
          </FormRow>
        </FormSection>

        <FormSection title="时间信息">
          <DateInputRow
            label="购入时间"
            value={purchaseDate}
            onChange={setPurchaseDate}
          />
          <DateInputRow
            label="开始使用时间"
            value={startDate}
            onChange={setStartDate}
          />
          <ToggleRow
            label="设置用完时间"
            checked={hasEndDate}
            onToggle={() => setHasEndDate((v) => !v)}
          />
          {hasEndDate ? (
            <DateInputRow
              label="用完时间"
              value={endDate}
              onChange={setEndDate}
            />
          ) : null}
          <ToggleRow
            label="设置过期时间"
            checked={hasExpiryDate}
            onToggle={() => setHasExpiryDate((v) => !v)}
          />
          {hasExpiryDate ? (
            <DateInputRow
              label="过期时间"
              value={expiryDate}
              onChange={setExpiryDate}
            />
          ) : null}
        </FormSection>
      </div>

      {validationError ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="alertdialog"
            aria-labelledby="validation-title"
            className="w-full max-w-sm rounded-card bg-bg-card p-6 shadow-lg"
          >
            <h2 id="validation-title" className="text-lg font-medium text-text">
              无法保存
            </h2>
            <p className="mt-2 text-sm text-text-secondary">{validationError}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setValidationError(null)}
                className="rounded-button px-4 py-2 text-sm text-primary hover:bg-bg-hover"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <OptionSheet
        open={areaSheetOpen}
        title="选择区域"
        options={selectableAreas}
        selectedId={areaId}
        onSelect={setAreaId}
        onClose={() => setAreaSheetOpen(false)}
        onAddNew={() => setNewAreaSheetOpen(true)}
        addLabel="新建区域"
      />

      <OptionSheet
        open={categorySheetOpen}
        title="选择分类"
        options={selectableCategories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setCategorySheetOpen(false)}
        onAddNew={() => setNewCategorySheetOpen(true)}
        addLabel="新建分类"
      />

      <QuickAddSheet
        open={newAreaSheetOpen}
        title="新建区域"
        placeholder="区域名称"
        onClose={() => setNewAreaSheetOpen(false)}
        onSubmit={handleAddArea}
        isPending={createArea.isPending}
      />

      <QuickAddSheet
        open={newCategorySheetOpen}
        title="新建分类"
        placeholder="分类名称"
        onClose={() => setNewCategorySheetOpen(false)}
        onSubmit={handleAddCategory}
        isPending={createCategory.isPending}
      />

      <OptionSheet
        open={unitSheetOpen}
        title="选择计量单位"
        options={units}
        selectedId={unitId}
        onSelect={setUnitId}
        onClose={() => setUnitSheetOpen(false)}
        onAddNew={() => setNewUnitSheetOpen(true)}
        addLabel="新建计量单位"
      />

      <QuickAddSheet
        open={newUnitSheetOpen}
        title="新建计量单位"
        placeholder="单位名称"
        onClose={() => setNewUnitSheetOpen(false)}
        onSubmit={handleAddUnit}
        isPending={createUnit.isPending}
      />
    </div>
  )
}
