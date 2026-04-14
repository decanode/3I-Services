import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

async function fetchMasterPage(afterCursor) {
  const params = new URLSearchParams();
  if (afterCursor != null) params.set('after', String(afterCursor));
  const res = await apiFetch(`/api/excel/master/paged?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Failed to load');
  return data; // { count, columns, rows, nextCursor }
}

export function useMasterData(afterCursor) {
  return useQuery({
    queryKey: ['master', afterCursor ?? 'first'],
    queryFn: () => fetchMasterPage(afterCursor),
    staleTime: 5 * 60 * 1000,         // 5 min — no refetch on revisit within window
    placeholderData: keepPreviousData, // v5 syntax — keeps previous page visible while next loads
  });
}
