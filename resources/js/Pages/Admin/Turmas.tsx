import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useBulkSelect } from '@/hooks/useBulkSelect';
import BulkActionBar from '@/Components/BulkActionBar';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Switch } from '@/Components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/Components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { Plus, Pencil, Trash2, Users, Search, Archive, ArchiveRestore } from 'lucide-react';
import { PageProps, PaginatedData, Classroom } from '@/types';
import FlashMessage from '@/Components/FlashMessage';
import { SortableTh, TablePagination, useTableNav } from '@/Components/AdminTable';

interface ClassroomRow extends Classroom {
  teacher_ids: number[];
  teacher_names: string[];
}

interface Props extends PageProps {
  classrooms: PaginatedData<ClassroomRow>;
  teachers: Array<{ id: number; name: string }>;
  filters: Record<string, string>;
}

type ClassroomFormData = {
  name: string;
  description: string;
  teacher_ids: number[];
  meeting_day: string;
  meeting_time: string;
  is_active: boolean;
};

function ClassroomForm({
  form,
  onSubmit,
  submitLabel,
  teachers,
}: {
  form: ReturnType<typeof useForm<ClassroomFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  teachers: Array<{ id: number; name: string }>;
}) {
  const toggleTeacher = (id: number) => {
    const ids = form.data.teacher_ids;
    form.setData('teacher_ids', ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1">
        <Label>Nome *</Label>
        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Descrição</Label>
        <Input value={form.data.description} onChange={(e) => form.setData('description', e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Professores</Label>
        {teachers.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum professor disponível.</p>
        ) : (
          <div className="flex flex-wrap gap-2 pt-1">
            {teachers.map((t) => {
              const selected = form.data.teacher_ids.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTeacher(t.id)}
                  className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                    selected
                      ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Dia da Semana</Label>
          <Input value={form.data.meeting_day} onChange={(e) => form.setData('meeting_day', e.target.value)} placeholder="Domingo" />
        </div>
        <div className="space-y-1">
          <Label>Hora</Label>
          <Input type="time" value={form.data.meeting_time} onChange={(e) => form.setData('meeting_time', e.target.value)} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={form.data.is_active}
          onCheckedChange={(v) => form.setData('is_active', v)}
        />
        <Label>Turma Ativa</Label>
      </div>
      <Button type="submit" className="w-full" disabled={form.processing}>
        {form.processing ? 'A guardar...' : submitLabel}
      </Button>
    </form>
  );
}

export default function Turmas({ classrooms, teachers, filters, errors }: Props) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<ClassroomRow | null>(null);
  const { handleSort: baseHandleSort, handlePerPage: baseHandlePerPage } = useTableNav('/admin/turmas', filters);
  const { selectedIds, selectedCount, isAllSelected, isIndeterminate, isSelected, toggleOne, toggleAll, clearSelection } = useBulkSelect(classrooms.data);

  const handleSort = (col: string, dir: string) => { clearSelection(); baseHandleSort(col, dir); };
  const handlePerPage = (n: number) => { clearSelection(); baseHandlePerPage(n); };

  const handleBulkDelete = () => {
    router.post('/admin/turmas/bulk-destroy', { ids: selectedIds }, {
      onSuccess: () => clearSelection(),
    });
  };

  const handleSearch = () => {
    router.get('/admin/turmas', { ...filters, search }, { preserveState: true });
  };

  const handleFilter = (key: string, value: string) => {
    router.get('/admin/turmas', { ...filters, [key]: value }, { preserveState: true });
  };

  const createForm = useForm({
    name: '',
    description: '',
    teacher_ids: [] as number[],
    meeting_day: '',
    meeting_time: '',
    is_active: false,
  });

  const editForm = useForm({
    name: '',
    description: '',
    teacher_ids: [] as number[],
    meeting_day: '',
    meeting_time: '',
    is_active: false,
  });

  const openEdit = (c: ClassroomRow) => {
    setEditItem(c);
    editForm.setData({
      name: c.name,
      description: c.description ?? '',
      teacher_ids: c.teacher_ids ?? [],
      meeting_day: c.meeting_day ?? '',
      meeting_time: c.meeting_time ?? '',
      is_active: c.is_active,
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createForm.post('/admin/turmas', {
      onSuccess: () => { setShowCreate(false); createForm.reset(); },
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    editForm.put(`/admin/turmas/${editItem.id}`, { onSuccess: () => setEditItem(null) });
  };

  const handleDelete = (c: ClassroomRow) => {
    if (confirm(`Eliminar turma "${c.name}"?`)) {
      router.delete(`/admin/turmas/${c.id}`);
    }
  };

  const handleToggleActive = (c: ClassroomRow) => {
    router.put(`/admin/turmas/${c.id}`, {
      name: c.name,
      description: c.description ?? '',
      teacher_ids: c.teacher_ids ?? [],
      meeting_day: c.meeting_day ?? '',
      meeting_time: c.meeting_time ?? '',
      is_active: !c.is_active,
    }, { preserveState: true });
  };

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Turmas' }]}>
      <Head title="Turmas — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Turmas</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Turma</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nova Turma</DialogTitle></DialogHeader>
              <ClassroomForm form={createForm} onSubmit={handleCreate} submitLabel="Criar Turma" teachers={teachers} />
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2 flex-1 min-w-[12rem]">
                <Input
                  placeholder="Pesquisar turma…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-8"
                />
                <Button size="sm" variant="outline" onClick={handleSearch} className="h-8">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Select value={filters.status ?? 'all'} onValueChange={(v) => handleFilter('status', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="inactive">Inativas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="px-0 pt-0">
            <BulkActionBar
              selectedCount={selectedCount}
              totalOnPage={classrooms.data.length}
              label="turmas"
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
                    <SortableTh label="Nome" column="name" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6" />
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Professores</th>
                    <SortableTh label="Dia" column="meeting_day" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="hidden lg:table-cell" />
                    <SortableTh label="Alunos" column="students_count" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} />
                    <SortableTh label="Estado" column="is_active" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} />
                    <th className="text-right px-6 py-3 text-slate-500 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {classrooms.data.map((c) => (
                    <tr key={c.id} className={isSelected(c.id) ? 'bg-blue-50/40' : 'hover:bg-slate-50'}>
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected(c.id)}
                          onChange={() => toggleOne(c.id)}
                          className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3">
                        <div>
                          <span className="font-medium">{c.name}</span>
                          {c.description && (
                            <p className="text-xs text-slate-400 truncate max-w-[14rem]">{c.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                        {c.teacher_names?.length > 0 ? c.teacher_names.join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                        {c.meeting_day ? `${c.meeting_day}${c.meeting_time ? ` ${c.meeting_time}` : ''}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.students_count ?? 0}</td>
                      <td className="px-4 py-3">
                        {c.is_active ? (
                          <Badge className="bg-green-100 text-green-800 text-xs">Ativa</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-400 text-xs">Inativa</Badge>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-slate-600">
                            <Link href={`/admin/turmas/${c.id}/alunos`}>
                              <Users className="h-3.5 w-3.5" />
                              Alunos
                              <span className="font-semibold">({c.students_count ?? 0})</span>
                            </Link>
                          </Button>
                          <Dialog open={editItem?.id === c.id} onOpenChange={(o) => !o && setEditItem(null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs" onClick={() => openEdit(c)}>
                                <Pencil className="h-3.5 w-3.5" />Editar
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader><DialogTitle>Editar Turma</DialogTitle></DialogHeader>
                              <ClassroomForm form={editForm} onSubmit={handleEdit} submitLabel="Guardar" teachers={teachers} />
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 px-2 gap-1 text-xs ${c.is_active ? 'text-amber-600' : 'text-green-600'}`}
                            onClick={() => handleToggleActive(c)}
                          >
                            {c.is_active ? (
                              <><Archive className="h-3.5 w-3.5" />Arquivar</>
                            ) : (
                              <><ArchiveRestore className="h-3.5 w-3.5" />Restaurar</>
                            )}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-red-500" onClick={() => handleDelete(c)}>
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
          data={classrooms}
          currentPath="/admin/turmas"
          params={filters}
          onPerPageChange={handlePerPage}
        />
      </div>
    </AdminLayout>
  );
}
