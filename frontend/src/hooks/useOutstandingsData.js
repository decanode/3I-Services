import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

async function fetchOutstandingsPage(afterCursor) {
  const params = new URLSearchParams();
  // afterCursor is now { nextCallDate, ledger_id } — serialize as JSON for the backend
  if (afterCursor != null) params.set('after', JSON.stringify(afterCursor));
  const res = await apiFetch(`/api/ledger-remainder/paged?${params}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Failed to load');
  return data; // { count, rows, nextCursor }
}

export function useOutstandingsData(afterCursor) {
  // Use a stable string key derived from the cursor object
  const cursorKey = afterCursor != null ? JSON.stringify(afterCursor) : 'first';
  return useQuery({
    queryKey: ['outstandings', cursorKey],
    queryFn: () => fetchOutstandingsPage(afterCursor),
    staleTime: 5 * 60 * 1000,         // 5 min — no refetch on revisit within window
    placeholderData: keepPreviousData, // keeps previous page visible while next loads
  });
}
