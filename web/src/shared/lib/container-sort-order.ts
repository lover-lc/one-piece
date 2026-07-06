import type { SupabaseClient } from '@supabase/supabase-js'

export async function persistContainerSortOrder(
  client: SupabaseClient,
  areaId: string,
  orderedIds: string[],
): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      client
        .from('containers')
        .update({ sort_order: index })
        .eq('id', id)
        .eq('area_id', areaId),
    ),
  )

  const error = results.find((result) => result.error)?.error
  if (error) throw error
}

export async function nextContainerSortOrder(
  client: SupabaseClient,
  areaId: string,
): Promise<number> {
  const { data, error } = await client
    .from('containers')
    .select('sort_order')
    .eq('area_id', areaId)
    .order('sort_order', { ascending: false })
    .limit(1)

  if (error) throw error

  return data && data.length > 0
    ? (data[0] as { sort_order: number }).sort_order + 1
    : 0
}
