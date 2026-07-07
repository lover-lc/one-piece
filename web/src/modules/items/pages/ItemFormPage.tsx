import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AppMotionBottomSheet from '../../../shared/components/motion/AppMotionBottomSheet'
import ItemHero from '../components/ItemHero'
import ItemFields, { type ItemFieldsCostStats } from '../components/ItemFields'
import { useAreas } from '../hooks/use-areas'
import { useCategories } from '../hooks/use-categories'
import { useCreateItem, useItem, useUpdateItem } from '../hooks/use-items'
import { useContainers } from '../../everything/hooks/use-containers'
import { useUnits } from '../hooks/use-units'
import PageHeaderBar from '../../../shared/components/PageHeaderBar'
import {
  dailyCost,
  formatUnitPrice,
  usedDays,
} from '../lib/cost-calculator'
import { parseISODate, toISODate } from '../../../shared/lib/date-utils'
import { getItemStatus } from '../lib/item-status'
import {
  parsePrice,
  parseQuantity,
  validateItemForm,
  validationErrorMessage,
} from '../lib/validators'

function OptionSheet({
  open,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
}: {
  open: boolean
  title: string
  options: { id: string; name: string }[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <AppMotionBottomSheet open={open} onClose={onClose} title={title}>
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
    </AppMotionBottomSheet>
  )
}

export default function ItemFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)

  const { data: existingItem, isLoading: itemLoading } = useItem(id)
  const { data: areas = [] } = useAreas()
  const { data: categories = [] } = useCategories()
  const { data: units = [] } = useUnits()
  const { data: containers = [] } = useContainers()
  const createItem = useCreateItem()
  const updateItem = useUpdateItem()

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
  const [containerId, setContainerId] = useState<string | null>(null)
  const [purchaseDate, setPurchaseDate] = useState<string | null>(todayIso)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [endDate, setEndDate] = useState<string | null>(null)
  const [expiryDate, setExpiryDate] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [prefillApplied, setPrefillApplied] = useState(false)

  const selectableUnits = useMemo(() => {
    const enabled = units.filter((u) => !u.isDisabled)
    if (unitId && !enabled.some((u) => u.id === unitId)) {
      const selected = units.find((u) => u.id === unitId)
      if (selected) return [...enabled, selected]
    }
    return enabled
  }, [units, unitId])

  const [areaSheetOpen, setAreaSheetOpen] = useState(false)
  const [categorySheetOpen, setCategorySheetOpen] = useState(false)
  const [unitSheetOpen, setUnitSheetOpen] = useState(false)
  const [containerSheetOpen, setContainerSheetOpen] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (isEdit || prefillApplied) return
    const preAreaId = searchParams.get('areaId')
    const preContainerId = searchParams.get('containerId')
    if (preAreaId) setAreaId(preAreaId)
    if (preContainerId) setContainerId(preContainerId)
    setPrefillApplied(true)
  }, [isEdit, prefillApplied, searchParams])

  useEffect(() => {
    if (isEdit || !prefillApplied || containers.length === 0) return
    if (!containerId) return
    const container = containers.find((c) => c.id === containerId)
    if (container?.areaId) {
      setAreaId(container.areaId)
    }
  }, [isEdit, prefillApplied, containerId, containers])

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
    setContainerId(existingItem.containerId)
    setPurchaseDate(existingItem.purchaseDate)
    setStartDate(existingItem.startDate)
    setEndDate(existingItem.endDate)
    setExpiryDate(existingItem.expiryDate)
    setInitialized(true)
  }, [isEdit, existingItem, initialized])

  const containersInArea = useMemo(() => {
    if (!areaId) return []
    return containers.filter((c) => c.areaId === areaId)
  }, [containers, areaId])

  useEffect(() => {
    if (!containerId || !areaId) return
    const container = containers.find((c) => c.id === containerId)
    if (container && container.areaId !== areaId) {
      setContainerId(null)
    }
  }, [areaId, containerId, containers])

  const selectedAreaName = areas.find((a) => a.id === areaId)?.name ?? null
  const selectedCategoryName =
    selectableCategories.find((c) => c.id === categoryId)?.name ??
    categories.find((c) => c.id === categoryId)?.name ??
    null
  const selectedUnitName = units.find((u) => u.id === unitId)?.name ?? null
  const selectedContainerName =
    containersInArea.find((c) => c.id === containerId)?.name ??
    containers.find((c) => c.id === containerId)?.name ??
    null

  const editStatus = useMemo(() => {
    if (!isEdit) return undefined
    return getItemStatus({
      endDate: endDate ? parseISODate(endDate) : null,
      expiryDate: expiryDate ? parseISODate(expiryDate) : null,
      today: new Date(),
    })
  }, [isEdit, endDate, expiryDate])

  const previewCostStats = useMemo((): ItemFieldsCostStats | undefined => {
    if (!isEdit || !startDate) return undefined
    const price = parsePrice(priceText)
    if (price === null) return undefined

    const days = usedDays(
      parseISODate(startDate),
      endDate ? parseISODate(endDate) : new Date(),
    )
    const quantity = parseQuantity(quantityText)
    const hasUnitPrice =
      quantity != null && quantity > 0 && selectedUnitName != null

    return {
      days,
      dailyCost: dailyCost(price, days),
      unitPrice: hasUnitPrice
        ? formatUnitPrice(price, quantity!, selectedUnitName!)
        : null,
    }
  }, [
    isEdit,
    startDate,
    priceText,
    endDate,
    quantityText,
    selectedUnitName,
  ])

  const isSaving = createItem.isPending || updateItem.isPending

  function handleAreaSelect(nextAreaId: string) {
    setAreaId(nextAreaId)
    const container = containerId
      ? containers.find((c) => c.id === containerId)
      : null
    if (container && container.areaId !== nextAreaId) {
      setContainerId(null)
    }
  }

  async function handleSave() {
    const error = validateItemForm({
      name,
      priceText,
      quantityText,
      unitId,
      areaId,
      categoryId,
      purchaseDate: purchaseDate ? parseISODate(purchaseDate) : null,
      startDate: startDate ? parseISODate(startDate) : null,
      endDate: endDate ? parseISODate(endDate) : null,
    })

    if (error) {
      setValidationError(validationErrorMessage(error))
      return
    }

    const price = parsePrice(priceText)
    if (price === null || !areaId || !categoryId || !purchaseDate) return

    const quantity = parseQuantity(quantityText)

    const payload = {
      name: name.trim(),
      purchasePrice: price,
      purchaseDate,
      quantity,
      unitId: quantity != null ? unitId : null,
      areaId,
      categoryId,
      specificLocation: '',
      containerId,
      startDate,
      endDate,
      expiryDate,
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
      <PageHeaderBar
        leading={{
          kind: 'button',
          label: '取消',
          onClick: () => navigate(-1),
          variant: 'outline',
        }}
        title={isEdit ? '编辑' : '添加'}
        trailing={{
          kind: 'button',
          label: isSaving ? '保存中…' : '保存',
          onClick: () => void handleSave(),
          variant: 'default',
          disabled: isSaving,
        }}
      />

      <div className="space-y-3 px-4 py-3">
        <ItemHero
          mode="edit"
          name={name}
          onNameChange={setName}
          status={editStatus}
          costStats={previewCostStats}
        />

        <ItemFields
          mode="edit"
          hideNameField
          hideStatusInGrid={editStatus != null}
          name={name}
          onNameChange={setName}
          priceText={priceText}
          onPriceChange={setPriceText}
          quantityText={quantityText}
          onQuantityChange={setQuantityText}
          unitName={selectedUnitName}
          onOpenUnitPicker={() => setUnitSheetOpen(true)}
          areaName={selectedAreaName}
          onOpenAreaPicker={() => setAreaSheetOpen(true)}
          categoryName={selectedCategoryName}
          onOpenCategoryPicker={() => setCategorySheetOpen(true)}
          containerName={selectedContainerName}
          containerPickerDisabled={!areaId}
          onOpenContainerPicker={() => setContainerSheetOpen(true)}
          purchaseDate={purchaseDate}
          onPurchaseDateChange={setPurchaseDate}
          startDate={startDate}
          onStartDateChange={setStartDate}
          endDate={endDate}
          onEndDateChange={setEndDate}
          expiryDate={expiryDate}
          onExpiryDateChange={setExpiryDate}
        />
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
        onSelect={handleAreaSelect}
        onClose={() => setAreaSheetOpen(false)}
      />

      <OptionSheet
        open={categorySheetOpen}
        title="选择分类"
        options={selectableCategories}
        selectedId={categoryId}
        onSelect={setCategoryId}
        onClose={() => setCategorySheetOpen(false)}
      />

      <OptionSheet
        open={containerSheetOpen}
        title="选择所在容器"
        options={[
          { id: '', name: '未指定' },
          ...containersInArea.map((c) => ({ id: c.id, name: c.name })),
        ]}
        selectedId={containerId ?? ''}
        onSelect={(nextId) => setContainerId(nextId || null)}
        onClose={() => setContainerSheetOpen(false)}
      />

      <OptionSheet
        open={unitSheetOpen}
        title="选择计量单位"
        options={selectableUnits}
        selectedId={unitId}
        onSelect={setUnitId}
        onClose={() => setUnitSheetOpen(false)}
      />
    </div>
  )
}
