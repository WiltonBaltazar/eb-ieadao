import { Head, Link, router } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { ArrowUpDown } from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import { TablePagination, useTableNav } from '@/Components/AdminTable';

interface StudentRow {
  id: number;
  name: string;
  phone: string;
  classroom_name: string;
  grupo_homogeneo_label: string | null;
  attended: number;
  total: number;
  rate: number;
}

interface Props extends PageProps {
  students: PaginatedData<StudentRow>;
  threshold: number;
  classrooms: Array<{ id: number; name: string; is_active: boolean }>;
  filters: {
    sort_dir: string;
    classroom_id: string | null;
    per_page: string;
  };
}

export default function Ranking({ students, threshold, classrooms, filters }: Props) {
  const { handlePerPage } = useTableNav('/admin/ranking', filters);

  const navigate = (params: Record<string, string>) => {
    router.get('/admin/ranking', { ...filters, ...params }, { preserveState: true });
  };

  const toggleSort = () => {
    navigate({ sort_dir: filters.sort_dir === 'desc' ? 'asc' : 'desc' });
  };

  const handleClassroom = (value: string) => {
    navigate({ classroom_id: value === 'all' ? '' : value });
  };

  // Calculate the global rank offset based on current page
  const rankOffset = (students.current_page - 1) * students.per_page;

  return (
    <AdminLayout breadcrumbs={[
      { label: 'Dashboard', href: '/admin' },
      { label: 'Ranking de Presenças' },
    ]}>
      <Head title="Ranking de Presenças — IEADAO" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Ranking de Presenças</h1>
          <p className="text-sm text-slate-500">{students.total} estudantes</p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Turma</span>
                <Select value={filters.classroom_id ?? 'all'} onValueChange={handleClassroom}>
                  <SelectTrigger className="h-8 w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as turmas</SelectItem>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}{!c.is_active ? ' (inativa)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={toggleSort}>
                <ArrowUpDown className="h-3.5 w-3.5" />
                {filters.sort_dir === 'desc' ? 'Melhor → Pior' : 'Pior → Melhor'}
              </Button>
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
                    <th className="text-left px-6 py-3 text-slate-500 font-medium w-10">#</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Turma</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Grupo</th>
                    <th className="text-center px-4 py-3 text-slate-500 font-medium">Presenças</th>
                    <th className="text-center px-4 py-3 text-slate-500 font-medium">Taxa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.data.map((s, i) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-400 font-mono text-xs">{rankOffset + i + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/utilizadores/${s.id}`} className="hover:underline">
                          <span className="font-medium">{s.name}</span>
                        </Link>
                        <p className="text-xs text-slate-400 md:hidden">{s.classroom_name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{s.classroom_name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                        {s.grupo_homogeneo_label?.replace('Grupo Homogéneo de ', '') ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-center text-slate-600">{s.attended}/{s.total}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge className={
                          s.rate >= threshold
                            ? 'bg-green-100 text-green-800'
                            : s.rate >= threshold * 0.7
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                        }>
                          {s.rate}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {students.data.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                        Nenhum estudante encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <TablePagination
          data={students}
          currentPath="/admin/ranking"
          params={filters}
          onPerPageChange={handlePerPage}
        />
      </div>
    </AdminLayout>
  );
}
