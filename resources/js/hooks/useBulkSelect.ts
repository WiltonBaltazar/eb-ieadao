import { useState, useCallback } from 'react';

export function useBulkSelect(items: { id: number }[]) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const selectedIds = Array.from(selected);
  const selectedCount = selected.size;
  const isAllSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const isIndeterminate = selectedCount > 0 && !isAllSelected;

  const isSelected = useCallback((id: number) => selected.has(id), [selected]);

  const toggleOne = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (items.every((item) => selected.has(item.id))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((item) => item.id)));
    }
  }, [items, selected]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return { selectedIds, selectedCount, isAllSelected, isIndeterminate, isSelected, toggleOne, toggleAll, clearSelection };
}
