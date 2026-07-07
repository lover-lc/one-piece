import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useCurrentMember } from '@/shared/hooks/use-current-member'
import { useFamilyMembers } from '@/shared/hooks/use-family-members'
import CheckinToast from '../components/CheckinToast'
import {
  calcBmrMifflinStJeor,
  calcDailyKcalTarget,
  type CheckinActivityLevel,
  type CheckinGender,
} from '../lib/bmr'
import { useCheckinProfiles, useUpsertCheckinProfile } from '../hooks/use-checkin-profiles'

const selectClass =
  'flex h-8 w-full rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50'

function numberOrNull(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

function ReadonlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  )
}

export default function CheckinProfilePage() {
  const { currentMemberId, currentMember, isLoading: memberLoading } = useCurrentMember()
  const { data: membersRaw = [] } = useFamilyMembers()
  const members = useMemo(
    () => [...membersRaw].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 2),
    [membersRaw],
  )

  const { data: profiles = [] } = useCheckinProfiles()
  const upsert = useUpsertCheckinProfile()

  const activeMember = currentMember ?? members[0] ?? null
  const canEdit = Boolean(activeMember && currentMemberId && activeMember.id === currentMemberId)

  const existing = useMemo(
    () => (activeMember ? profiles.find((p) => p.memberId === activeMember.id) ?? null : null),
    [profiles, activeMember],
  )

  const [heightCm, setHeightCm] = useState<string>('')
  const [weightKg, setWeightKg] = useState<string>('')
  const [gender, setGender] = useState<CheckinGender | ''>('')
  const [birthDate, setBirthDate] = useState<string>('')
  const [activityLevel, setActivityLevel] = useState<CheckinActivityLevel | ''>('')
  const [targetKcal, setTargetKcal] = useState<string>('')
  const [targetFatG, setTargetFatG] = useState<string>('')
  const [targetProteinG, setTargetProteinG] = useState<string>('')
  const [targetCarbsG, setTargetCarbsG] = useState<string>('')
  const [targetExerciseMinutes, setTargetExerciseMinutes] = useState<string>('')
  const [targetWaterMl, setTargetWaterMl] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const dismissToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    setError(null)
    setHeightCm(existing?.heightCm != null ? String(existing.heightCm) : '')
    setWeightKg(existing?.weightKg != null ? String(existing.weightKg) : '')
    setGender(existing?.gender ?? '')
    setBirthDate(existing?.birthDate ?? '')
    setActivityLevel(existing?.activityLevel ?? '')
    setTargetKcal(existing?.targetKcal != null ? String(existing.targetKcal) : '')
    setTargetFatG(existing?.targetFatG != null ? String(existing.targetFatG) : '')
    setTargetProteinG(existing?.targetProteinG != null ? String(existing.targetProteinG) : '')
    setTargetCarbsG(existing?.targetCarbsG != null ? String(existing.targetCarbsG) : '')
    setTargetExerciseMinutes(
      existing?.targetExerciseMinutes != null ? String(existing.targetExerciseMinutes) : '',
    )
    setTargetWaterMl(existing?.targetWaterMl != null ? String(existing.targetWaterMl) : '')
  }, [existing?.id, activeMember?.id])

  const computedBmr = useMemo(() => {
    const w = numberOrNull(weightKg)
    const h = numberOrNull(heightCm)
    if (!w || !h || !gender || !birthDate) return null
    try {
      return calcBmrMifflinStJeor({ weightKg: w, heightCm: h, gender, birthDate })
    } catch {
      return null
    }
  }, [weightKg, heightCm, gender, birthDate])

  const suggestedDailyKcal = useMemo(() => {
    if (!computedBmr || !activityLevel) return null
    return calcDailyKcalTarget(computedBmr, activityLevel)
  }, [computedBmr, activityLevel])

  async function handleSave() {
    if (!activeMember || !canEdit) return
    setError(null)
    try {
      await upsert.mutateAsync({
        memberId: activeMember.id,
        heightCm: numberOrNull(heightCm),
        weightKg: numberOrNull(weightKg),
        gender: gender || null,
        birthDate: birthDate || null,
        activityLevel: activityLevel || null,
        targetKcal: numberOrNull(targetKcal),
        targetFatG: numberOrNull(targetFatG),
        targetProteinG: numberOrNull(targetProteinG),
        targetCarbsG: numberOrNull(targetCarbsG),
        targetExerciseMinutes: numberOrNull(targetExerciseMinutes),
        targetWaterMl: numberOrNull(targetWaterMl),
      })
      setToast('已保存')
    } catch (err) {
      setError(String((err as Error).message || '保存失败'))
    }
  }

  if (memberLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-muted-foreground">加载中…</div>
    )
  }

  if (!activeMember) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-muted-foreground">暂无成员</div>
    )
  }

  const fieldDisabled = !canEdit

  return (
    <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
      <div>
        <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight">
          健康档案
        </h1>
        <p className="text-sm text-muted-foreground">
          {canEdit ? '编辑你的目标与基础信息' : `${activeMember.name} 的档案（只读）`}
        </p>
      </div>

      <section className="space-y-2 rounded-card border border-border/60 bg-card p-3 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">基础信息</h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="heightCm" className="text-xs text-muted-foreground">
              身高 cm
            </Label>
            <Input
              id="heightCm"
              className="mt-0.5 h-8"
              inputMode="decimal"
              disabled={fieldDisabled}
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="170"
            />
          </div>
          <div>
            <Label htmlFor="weightKg" className="text-xs text-muted-foreground">
              体重 kg
            </Label>
            <Input
              id="weightKg"
              className="mt-0.5 h-8"
              inputMode="decimal"
              disabled={fieldDisabled}
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="65"
            />
          </div>
          <div>
            <Label htmlFor="gender" className="text-xs text-muted-foreground">
              性别
            </Label>
            <select
              id="gender"
              className={cn(selectClass, 'mt-0.5')}
              disabled={fieldDisabled}
              value={gender}
              onChange={(e) => setGender((e.target.value || '') as CheckinGender | '')}
            >
              <option value="">未设置</option>
              <option value="male">男</option>
              <option value="female">女</option>
            </select>
          </div>
          <div>
            <Label htmlFor="birthDate" className="text-xs text-muted-foreground">
              出生日期
            </Label>
            <Input
              id="birthDate"
              className="mt-0.5 h-8"
              type="date"
              disabled={fieldDisabled}
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <Label htmlFor="activityLevel" className="text-xs text-muted-foreground">
              活动水平
            </Label>
            <select
              id="activityLevel"
              className={cn(selectClass, 'mt-0.5')}
              disabled={fieldDisabled}
              value={activityLevel}
              onChange={(e) =>
                setActivityLevel((e.target.value || '') as CheckinActivityLevel | '')
              }
            >
              <option value="">未设置</option>
              <option value="sedentary">久坐</option>
              <option value="light">轻度</option>
              <option value="moderate">中度</option>
              <option value="heavy">高强度</option>
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-card border border-border/60 bg-card p-3 shadow-card">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">代谢</h2>
        <ReadonlyRow label="BMR" value={computedBmr != null ? `${computedBmr} kcal` : '—'} />
        <ReadonlyRow
          label="建议每日热量"
          value={suggestedDailyKcal != null ? `${suggestedDailyKcal} kcal` : '—'}
        />
      </section>

      <section className="space-y-2 rounded-card border border-border/60 bg-card p-3 shadow-card">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">目标</h2>
        <div>
          <Label htmlFor="targetKcal" className="text-xs text-muted-foreground">
            热量 kcal
          </Label>
          <Input
            id="targetKcal"
            className="mt-0.5 h-8"
            inputMode="numeric"
            disabled={fieldDisabled}
            value={targetKcal}
            onChange={(e) => setTargetKcal(e.target.value)}
            placeholder={suggestedDailyKcal != null ? String(suggestedDailyKcal) : '1800'}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label htmlFor="targetProteinG" className="text-xs text-muted-foreground">
              蛋白质 g
            </Label>
            <Input
              id="targetProteinG"
              className="mt-0.5 h-8"
              inputMode="numeric"
              disabled={fieldDisabled}
              value={targetProteinG}
              onChange={(e) => setTargetProteinG(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="targetFatG" className="text-xs text-muted-foreground">
              脂肪 g
            </Label>
            <Input
              id="targetFatG"
              className="mt-0.5 h-8"
              inputMode="numeric"
              disabled={fieldDisabled}
              value={targetFatG}
              onChange={(e) => setTargetFatG(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="targetCarbsG" className="text-xs text-muted-foreground">
              碳水 g
            </Label>
            <Input
              id="targetCarbsG"
              className="mt-0.5 h-8"
              inputMode="numeric"
              disabled={fieldDisabled}
              value={targetCarbsG}
              onChange={(e) => setTargetCarbsG(e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="targetExerciseMinutes" className="text-xs text-muted-foreground">
              运动 分钟
            </Label>
            <Input
              id="targetExerciseMinutes"
              className="mt-0.5 h-8"
              inputMode="numeric"
              disabled={fieldDisabled}
              value={targetExerciseMinutes}
              onChange={(e) => setTargetExerciseMinutes(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="targetWaterMl" className="text-xs text-muted-foreground">
              饮水 ml
            </Label>
            <Input
              id="targetWaterMl"
              className="mt-0.5 h-8"
              inputMode="numeric"
              disabled={fieldDisabled}
              value={targetWaterMl}
              onChange={(e) => setTargetWaterMl(e.target.value)}
            />
          </div>
        </div>

        {canEdit ? (
          <>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="button"
              className="h-9 w-full"
              onClick={() => void handleSave()}
              disabled={upsert.isPending}
            >
              {upsert.isPending ? '保存中…' : '保存'}
            </Button>
          </>
        ) : null}
      </section>

      <CheckinToast message={toast} onDismiss={dismissToast} />
    </div>
  )
}
