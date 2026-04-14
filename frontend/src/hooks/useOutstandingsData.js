import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

async function fetchOutstandingsPage(afterCursor) {
  const params = new URLSearchParams();
  if (afterCursor != null) params.set('after', String(afterCursor));
  const res = await apiFetch(`/api/ledger-remainder/paged?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Failed to load');
  return data; // { count, rows, nextCursor }
}

export function useOutstandingsData(afterCursor) {
  return useQuery({
    queryKey: ['outstandings', afterCursor ?? 'first'],
    queryFn: () => fetchOutstandingsPage(afterCursor),
    staleTime: 5 * 60 * 1000,         // 5 min — no refetch on revisit within window
    placeholderData: keepPreviousData, // keeps previous page visible while next loads
  });
}
