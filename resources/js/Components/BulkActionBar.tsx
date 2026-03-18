import { useState } from 'react';
import { Button } from '@/Components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Trash2 } from 'lucide-react';

interface Props {
  selectedCount: number;
  totalOnPage: number;
  label: string;
  onConfirmDelete: () => void;
  onClear: () => void;
  onSelectAll: () => void;
}

export default function BulkActionBar({ selectedCount, totalOnPage, label, onConfirmDelete, onClear, onSelectAll }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border-b border-blue-100">
      <span className="text-sm font-medium text-blue-800">
        {selectedCount} selecionado{selectedCount !== 1 ? 's' : ''}
      </span>
      <div className="flex items-center gap-1.5 ml-auto">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2.5 text-xs"
          onClick={onSelectAll}
        >
          Selecionar tudo
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2.5 text-xs text-slate-500"
          onClick={onClear}
        >
          Limpar seleção
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2.5 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Eliminar selecionados
        </Button>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar eliminação</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Vai eliminar {selectedCount} {label}.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => { setShowConfirm(false); onConfirmDelete(); }}
            >
              Confirmar eliminação
            </Button>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
