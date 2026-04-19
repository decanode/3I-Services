import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

async function fetchAllMaster() {
  const res = await apiFetch('/api/excel/master?limit=2000');
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Failed to load master data');
  return data; // { count, columns, rows }
}

export function useAllMasterData(userId) {
  return useQuery({
    queryKey: ['master-all', userId],
    queryFn: fetchAllMaster,
    staleTime: Infinity, // serve from cache until page refresh or user change
    select: (data) => ({
      rows: data.rows ?? [],
      columns: data.columns ?? [],
    }),
  });
}
