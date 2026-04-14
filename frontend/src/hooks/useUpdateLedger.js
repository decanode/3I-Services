import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

async function updateLedger({ ledger_id, payload }) {
  const res = await apiFetch(`/api/ledger-remainder/${ledger_id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Update failed');
  return data;
}

/**
 * Mutation hook for updating a ledger record.
 *
 * Lifecycle:
 *   1. onMutate  — optimistically patches the in-memory cache so the UI
 *                  reflects the change instantly, before the server responds.
 *   2. onError   — if the server rejects the request, the cache is rolled back
 *                  to the snapshot taken in onMutate.
 *   3. onSettled — invalidates all ['master'] query keys so any subsequent
 *                  page visit fetches fresh data from the server.
 *
 * @param {number|null} currentCursor - the cursor of the currently visible page,
 *                                      used to target the correct cache entry for
 *                                      the optimistic update.
 */
export function useUpdateLedger(currentCursor) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateLedger,

    onMutate: async ({ ledger_id, payload }) => {
      const queryKey = ['master', currentCursor ?? 'first'];

      // Stop any in-flight refetch from overwriting the optimistic patch
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the current cache so we can roll back on failure
      const previousData = queryClient.getQueryData(queryKey);

      // Apply the patch immediately in the cache
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          rows: old.rows.map((row) =>
            row.ledger_id === ledger_id ? { ...row, ...payload } : row
          ),
        };
      });

      return { previousData, queryKey };
    },

    onError: (_err, _vars, context) => {
      // Roll back to the pre-mutation snapshot
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },

    onSettled: () => {
      // Wipe all cached master pages so next visit fetches fresh data
      queryClient.invalidateQueries({ queryKey: ['master'] });
    },
  });
}
