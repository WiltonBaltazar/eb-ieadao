import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useBulkSelect } from '@/hooks/useBulkSelect';
import BulkActionBar from '@/Components/BulkActionBar';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Plus, QrCode, Play, Square, RefreshCw, Trash2, Users, Pencil, RotateCcw, ChevronDown, Search, X } from 'lucide-react';
import { PageProps, PaginatedData, StudySession } from '@/types';
import FlashMessage from '@/Components/FlashMessage';
import { SortableTh, TablePagination, useTableNav } from '@/Components/AdminTable';
import PageHeader from '@/Components/PageHeader';
import { statusColors } from '@/lib/constants';

interface ClassroomOption {
  id: number;
  name: string;
  teacher_ids: number[];
}

interface TeacherOption {
  id: number;
  name: string;
}

interface Props extends PageProps {
  sessions: PaginatedData<StudySession>;
  classrooms: ClassroomOption[];
  teachers: TeacherOption[];
  filters: Record<string, string>;
}

// ── Searchable select ──────────────────────────────────────────────────────────
function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Seleciona…',
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    setOpen((o) => {
      if (!o) setTimeout(() => inputRef.current?.focus(), 0);
      else setSearch('');
      return !o;
    });
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
      >
        <span className={selected ? 'text-foreground' : 'text-muted-foreground'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-md">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                ref={inputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar…"
                className="h-7 pl-7 text-xs"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-xs text-slate-400">Sem resultados</p>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-100 transition-colors ${
                    o.value === value ? 'bg-slate-50 font-medium' : ''
                  }`}
                  onClick={() => {
                    onValueChange(o.value);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  {o.label || <span className="text-slate-400 italic">Nenhum</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
// ──────────────────────────────────────────────────────────────────────────────

const statusOptions = [
  { value: 'draft', label: 'Rascunho' },
  { value: 'open', label: 'Aberta' },
  { value: 'closed', label: 'Fechada' },
];

export default function Sessoes({ sessions, classrooms, teachers, filters }: Props) {
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<StudySession | null>(null);
  const { navigate, handleSort: baseHandleSort, handlePerPage: baseHandlePerPage } = useTableNav('/admin/sessoes', filters);
  const { selectedIds, selectedCount, isAllSelected, isIndeterminate, isSelected, toggleOne, toggleAll, clearSelection } = useBulkSelect(sessions.data);

  const handleSort = (col: string, dir: string) => { clearSelection(); baseHandleSort(col, dir); };
  const handlePerPage = (n: number) => { clearSelection(); baseHandlePerPage(n); };

  const handleBulkDelete = () => {
    router.post('/admin/sessoes/bulk-destroy', { ids: selectedIds }, {
      onSuccess: () => clearSelection(),
    });
  };

  const createForm = useForm({
    classroom_id: '',
    teacher_id: '',
    title: '',
    session_date: '',
    lesson_type: '',
    notes: '',
  });

  const editForm = useForm({
    teacher_id: '',
    title: '',
    session_date: '',
    lesson_type: '',
    notes: '',
  });

  const availableTeachers = useMemo(() => {
    if (!createForm.data.classroom_id) return teachers;
    const classroom = classrooms.find((c) => String(c.id) === createForm.data.classroom_id);
    if (!classroom?.teacher_ids?.length) return teachers;
    return teachers.filter((t) => classroom.teacher_ids.includes(t.id));
  }, [createForm.data.classroom_id, classrooms, teachers]);

  const editTeachers = useMemo(() => {
    if (!editItem) return teachers;
    const classroom = classrooms.find((c) => c.id === editItem.classroom_id);
    if (!classroom?.teacher_ids?.length) return teachers;
    return teachers.filter((t) => classroom.teacher_ids.includes(t.id));
  }, [editItem, classrooms, teachers]);

  const openEdit = (s: StudySession) => {
    setEditItem(s);
    editForm.setData({
      teacher_id: s.teacher_id ? String(s.teacher_id) : '',
      title: s.title,
      session_date: s.session_date_iso,
      lesson_type: s.lesson_type ?? '',
      notes: '',
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createForm.post('/admin/sessoes', { onSuccess: () => { setShowCreate(false); createForm.reset(); } });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    editForm.put(`/admin/sessoes/${editItem.id}`, { onSuccess: () => setEditItem(null) });
  };

  const handleOpen = (id: number) => router.post(`/admin/sessoes/${id}/abrir`);
  const handleClose = (id: number) => router.post(`/admin/sessoes/${id}/fechar`);
  const handleRegenerate = (id: number) => router.post(`/admin/sessoes/${id}/regenerar-codigo`);
  const handleDelete = (id: number, title: string) => {
    if (confirm(`Eliminar "${title}"?`)) router.delete(`/admin/sessoes/${id}`);
  };

  // Options arrays for searchable selects
  const classroomOptions = classrooms.map((c) => ({ value: String(c.id), label: c.name }));
  const teacherOptions = (list: TeacherOption[]) => [
    { value: '', label: '' },
    ...list.map((t) => ({ value: String(t.id), label: t.name })),
  ];

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Aulas' }]}>
      <Head title="Aulas — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <PageHeader
          title="Aulas"
          action={
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />Nova Aula
            </Button>
          }
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={filters.classroom_id ?? ''}
            onChange={(e) => { clearSelection(); navigate({ classroom_id: e.target.value, page: 1 }); }}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todas as turmas</option>
            {classrooms.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>

          <select
            value={filters.status ?? ''}
            onChange={(e) => { clearSelection(); navigate({ status: e.target.value, page: 1 }); }}
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todos os estados</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          {(filters.classroom_id || filters.status) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-slate-500"
              onClick={() => { clearSelection(); navigate({ classroom_id: '', status: '', page: 1 }); }}
            >
              <X className="h-3.5 w-3.5 mr-1" />Limpar filtros
            </Button>
          )}
        </div>

        {/* Create dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Nova Aula</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-1">
                <Label>Turma *</Label>
                <SearchableSelect
                  value={createForm.data.classroom_id}
                  onValueChange={(v) => createForm.setData({ ...createForm.data, classroom_id: v, teacher_id: '' })}
                  options={classroomOptions}
                  placeholder="Pesquisa turma…"
                />
              </div>
              <div className="space-y-1">
                <Label>Professor</Label>
                <SearchableSelect
                  value={createForm.data.teacher_id}
                  onValueChange={(v) => createForm.setData('teacher_id', v)}
                  options={teacherOptions(availableTeachers)}
                  placeholder="Pesquisa professor…"
                />
              </div>
              <div className="space-y-1">
                <Label>Título *</Label>
                <Input value={createForm.data.title} onChange={(e) => createForm.setData('title', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={createForm.data.session_date} onChange={(e) => createForm.setData('session_date', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Lição</Label>
                <Input value={createForm.data.lesson_type} onChange={(e) => createForm.setData('lesson_type', e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={createForm.processing}>
                {createForm.processing ? 'A criar…' : 'Criar Aula'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit dialog */}
        <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Editar Aula</DialogTitle></DialogHeader>
            <form onSubmit={handleEdit} className="space-y-3">
              <div className="space-y-1">
                <Label>Professor</Label>
                <SearchableSelect
                  value={editForm.data.teacher_id}
                  onValueChange={(v) => editForm.setData('teacher_id', v)}
                  options={teacherOptions(editTeachers)}
                  placeholder="Pesquisa professor…"
                />
              </div>
              <div className="space-y-1">
                <Label>Título *</Label>
                <Input value={editForm.data.title} onChange={(e) => editForm.setData('title', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={editForm.data.session_date} onChange={(e) => editForm.setData('session_date', e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Tipo de Lição</Label>
                <Input value={editForm.data.lesson_type} onChange={(e) => editForm.setData('lesson_type', e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={editForm.processing}>
                  {editForm.processing ? 'A guardar…' : 'Guardar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancelar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Card>
          <CardContent className="px-0 pt-0">
            <BulkActionBar
              selectedCount={selectedCount}
              totalOnPage={sessions.data.length}
              label="aulas"
              onConfirmDelete={handleBulkDelete}
              onClear={clearSelection}
              onSelectAll={toggleAll}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm admin-table">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <SortableTh label="Título" column="title" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6" />
                    <SortableTh label="Data" column="session_date" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="hidden md:table-cell" />
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Turma</th>
                    
                    <SortableTh label="Estado" column="status" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} />
                    <SortableTh label="Pres." column="attendances_count" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="hidden lg:table-cell" />
                    <th className="text-right px-6 py-3 text-slate-500 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sessions.data.map((s) => (
                    <tr key={s.id} className={isSelected(s.id) ? 'bg-blue-50/40' : 'hover:bg-slate-50'}>
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected(s.id)}
                          onChange={() => toggleOne(s.id)}
                          className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3 font-medium max-w-[12rem] truncate">{s.title}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{s.session_date}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{s.classroom_name}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[s.status] ?? ''}>{s.status_label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{s.attendances_count}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {s.status === 'draft' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-green-700" onClick={() => handleOpen(s.id)}>
                              <Play className="h-3.5 w-3.5" />Abrir
                            </Button>
                          )}
                          {s.status === 'closed' && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-green-700" onClick={() => handleOpen(s.id)}>
                              <RotateCcw className="h-3.5 w-3.5" />Reactivar
                            </Button>
                          )}
                          {s.status === 'open' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => handleClose(s.id)}>
                                <Square className="h-3.5 w-3.5" />Fechar
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-blue-700" onClick={() => handleRegenerate(s.id)}>
                                <RefreshCw className="h-3.5 w-3.5" />Código
                              </Button>
                              <Button asChild size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-purple-700">
                                <Link href={`/qr/sessao/${s.id}`} target="_blank">
                                  <QrCode className="h-3.5 w-3.5" />QR
                                </Link>
                              </Button>
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-slate-600" onClick={() => openEdit(s)}>
                            <Pencil className="h-3.5 w-3.5" />Editar
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-slate-600">
                            <Link href={`/admin/sessoes/${s.id}/presencas`}>
                              <Users className="h-3.5 w-3.5" />Ver Presenças
                            </Link>
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-red-500" onClick={() => handleDelete(s.id, s.title)}>
                            <Trash2 className="h-3.5 w-3.5" />Eliminar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <TablePagination
          data={sessions}
          currentPath="/admin/sessoes"
          params={filters}
          onPerPageChange={handlePerPage}
        />
      </div>
    </AdminLayout>
  );
}
