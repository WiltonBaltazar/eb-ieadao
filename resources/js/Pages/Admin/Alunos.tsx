import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { Label } from '@/Components/ui/label';
import { Search, ArrowRightLeft, Eye, X } from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import FlashMessage from '@/Components/FlashMessage';
import { SortableTh, TablePagination, useTableNav } from '@/Components/AdminTable';

interface StudentRow {
  id: number;
  name: string;
  phone: string | null;
  classroom_id: number | null;
  classroom_name: string | null;
  grupo_homogeneo: string | null;
  grupo_homogeneo_label: string | null;
  attendance_rate: number;
}

interface Props extends PageProps {
  students: PaginatedData<StudentRow>;
  classrooms: Array<{ id: number; name: string }>;
  gruposOptions: Array<{ value: string; label: string }>;
  filters: Record<string, string>;
}

const grupoColors: Record<string, string> = {
  homens:   'bg-indigo-100 text-indigo-700',
  senhoras: 'bg-pink-100 text-pink-700',
  jovens:   'bg-amber-100 text-amber-700',
  criancas: 'bg-teal-100 text-teal-700',
};

export default function Alunos({ students, classrooms, gruposOptions, filters }: Props) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [transferStudent, setTransferStudent] = useState<StudentRow | null>(null);
  const [newClassroomId, setNewClassroomId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const { handleSort, handlePerPage } = useTableNav('/admin/alunos', filters);

  const handleSearch = () => {
    router.get('/admin/alunos', { ...filters, search }, { preserveState: true });
  };

  const handleFilter = (key: string, value: string) => {
    router.get('/admin/alunos', { ...filters, [key]: value }, { preserveState: true });
  };

  const openTransfer = (student: StudentRow) => {
    setTransferStudent(student);
    setNewClassroomId(student.classroom_id ? String(student.classroom_id) : 'none');
  };

  const handleTransfer = () => {
    if (!transferStudent) return;
    setTransferring(true);
    router.put(
      `/admin/alunos/${transferStudent.id}/transfer`,
      { classroom_id: newClassroomId === 'none' ? null : newClassroomId },
      {
        onSuccess: () => {
          setTransferStudent(null);
          setNewClassroomId('');
          setTransferring(false);
        },
        onError: () => setTransferring(false),
      },
    );
  };

  const hasFilters = !!(filters.search || filters.classroom_id || filters.grupo_homogeneo);

  const clearFilters = () => {
    router.get('/admin/alunos', {}, { preserveState: true });
  };

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Alunos' }]}>
      <Head title="Alunos — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Alunos</h1>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2 flex-1 min-w-[12rem]">
                <Input
                  placeholder="Pesquisar por nome ou telefone…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-8"
                />
                <Button size="sm" variant="outline" onClick={handleSearch} className="h-8">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Select
                value={filters.classroom_id ?? 'all'}
                onValueChange={(v) => handleFilter('classroom_id', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  <SelectItem value="none">Sem turma</SelectItem>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.grupo_homogeneo ?? 'all'}
                onValueChange={(v) => handleFilter('grupo_homogeneo', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue placeholder="Todos os grupos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os grupos</SelectItem>
                  {gruposOptions.map((g) => (
                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button size="sm" variant="ghost" className="h-8 text-slate-500" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5 mr-1" />Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="px-0 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm admin-table">
                <thead className="border-b border-slate-100">
                  <tr>
                    <SortableTh label="Nome" column="name" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6" />
                    <SortableTh label="Contacto" column="phone" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="hidden md:table-cell" />
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Turma</th>
                    <SortableTh label="Grupo" column="grupo_homogeneo" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="hidden lg:table-cell" />
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Presenças</th>
                    <th className="text-right px-6 py-3 text-slate-500 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        Nenhum aluno encontrado.
                      </td>
                    </tr>
                  ) : students.data.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                        {s.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {s.classroom_name ? (
                          <span className="text-slate-700">{s.classroom_name}</span>
                        ) : (
                          <span className="text-slate-300 text-xs italic">Sem turma</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {s.grupo_homogeneo ? (
                          <Badge className={`text-xs ${grupoColors[s.grupo_homogeneo] ?? ''}`}>
                            {s.grupo_homogeneo_label}
                          </Badge>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs font-semibold tabular-nums ${
                          s.attendance_rate >= 75 ? 'text-green-600' : s.attendance_rate >= 50 ? 'text-amber-600' : 'text-red-500'
                        }`}>
                          {s.attendance_rate}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 gap-1 text-xs text-blue-600"
                            onClick={() => openTransfer(s)}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />Transferir
                          </Button>
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-slate-600">
                            <Link href={`/admin/utilizadores/${s.id}`}>
                              <Eye className="h-3.5 w-3.5" />Ver
                            </Link>
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
          data={students}
          currentPath="/admin/alunos"
          params={filters}
          onPerPageChange={handlePerPage}
        />
      </div>

      {/* Transfer Dialog */}
      <Dialog open={!!transferStudent} onOpenChange={(o) => !o && setTransferStudent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transferir Aluno</DialogTitle>
          </DialogHeader>
          {transferStudent && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                <span className="font-medium">{transferStudent.name}</span>
                {transferStudent.classroom_name && (
                  <> — atualmente em <span className="font-medium">{transferStudent.classroom_name}</span></>
                )}
              </p>
              <div className="space-y-1.5">
                <Label>Nova turma</Label>
                <Select value={newClassroomId} onValueChange={setNewClassroomId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar turma…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem turma</SelectItem>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  onClick={handleTransfer}
                  disabled={transferring || newClassroomId === (transferStudent.classroom_id ? String(transferStudent.classroom_id) : 'none')}
                >
                  {transferring ? 'A transferir…' : 'Confirmar transferência'}
                </Button>
                <Button variant="outline" onClick={() => setTransferStudent(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
