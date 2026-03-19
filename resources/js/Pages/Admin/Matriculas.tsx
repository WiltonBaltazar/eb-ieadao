import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { Search, Copy, X } from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import FlashMessage from '@/Components/FlashMessage';
import { TablePagination } from '@/Components/AdminTable';

interface EnrollmentRow {
  id: number;
  student_id: number;
  student_name: string;
  student_phone: string | null;
  classroom_id: number;
  classroom_name: string;
  enrolled_at: string;
}

interface Props extends PageProps {
  enrollments: PaginatedData<EnrollmentRow>;
  classrooms: Array<{ id: number; name: string }>;
  year: number;
  availableYears: number[];
  filters: Record<string, string>;
}

export default function Matriculas({ enrollments, classrooms, year, availableYears, filters }: Props) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [fromYear, setFromYear] = useState(String(year));
  const [toYear, setToYear] = useState(String(year + 1));
  const [copying, setCopying] = useState(false);

  const basePath = '/admin/matriculas';

  const handleFilter = (key: string, value: string) => {
    router.get(basePath, { ...filters, [key]: value || undefined }, { preserveState: true });
  };

  const handleSearch = () => {
    handleFilter('search', search);
  };

  const handleCopyYear = () => {
    setCopying(true);
    router.post('/admin/matriculas/copiar-ano', { from_year: fromYear, to_year: toYear }, {
      onSuccess: () => { setCopyDialogOpen(false); setCopying(false); },
      onError: () => setCopying(false),
    });
  };

  const clearFilters = () => {
    router.get(basePath, { year: String(year) }, { preserveState: true });
  };

  const hasFilters = !!(filters.search || filters.classroom_id);

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Matrículas' }]}>
      <Head title="Matrículas — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-slate-800">Matrículas</h1>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCopyDialogOpen(true)}>
            <Copy className="h-4 w-4" />
            Copiar do ano anterior
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3 items-center">
              <Select
                value={String(year)}
                onValueChange={(v) => handleFilter('year', v)}
              >
                <SelectTrigger className="h-8 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.classroom_id ?? 'all'}
                onValueChange={(v) => handleFilter('classroom_id', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="h-8 w-44">
                  <SelectValue placeholder="Todas as turmas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as turmas</SelectItem>
                  {classrooms.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2 flex-1 min-w-[12rem]">
                <Input
                  placeholder="Pesquisar aluno…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-8"
                />
                <Button size="sm" variant="outline" onClick={handleSearch} className="h-8">
                  <Search className="h-4 w-4" />
                </Button>
              </div>

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
          <CardHeader className="pb-2 pt-4 px-6">
            <CardTitle className="text-base">
              {enrollments.total} matrícula{enrollments.total !== 1 ? 's' : ''} — {year}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/50">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-slate-500">Aluno</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Contacto</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Turma</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Inscrito em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {enrollments.data.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        Nenhuma matrícula encontrada para {year}.
                      </td>
                    </tr>
                  ) : enrollments.data.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium">{e.student_name}</td>
                      <td className="px-4 py-3 text-slate-500">{e.student_phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Badge className="bg-slate-100 text-slate-700">{e.classroom_name}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{e.enrolled_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <TablePagination
          data={enrollments}
          currentPath={basePath}
          params={filters}
          onPerPageChange={(pp) => router.get(basePath, { ...filters, per_page: pp })}
        />
      </div>

      {/* Copy Year Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={(o) => !o && setCopyDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Copiar Matrículas de Ano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Copia todas as matrículas ativas de um ano para outro. Alunos já inscritos no ano de destino não são duplicados.
            </p>
            <div className="space-y-2">
              <Label>Ano de origem</Label>
              <Select value={fromYear} onValueChange={setFromYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ano de destino</Label>
              <Input
                type="number"
                min={2000}
                max={2100}
                value={toYear}
                onChange={(e) => setToYear(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleCopyYear} disabled={copying || fromYear === toYear}>
                {copying ? 'A copiar…' : 'Copiar matrículas'}
              </Button>
              <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
