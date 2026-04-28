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
import { Copy, X, CalendarPlus, ArrowRight, Trash2 } from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import FlashMessage from '@/Components/FlashMessage';
import { SortableTh, TablePagination, useTableNav } from '@/Components/AdminTable';
import PageHeader from '@/Components/PageHeader';
import SearchInput from '@/Components/SearchInput';

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
  currentYear: number;
  availableYears: number[];
  filters: Record<string, string>;
}

export default function Matriculas({ enrollments, classrooms, year, currentYear, availableYears, filters }: Props) {
  const basePath = '/admin/matriculas';
  const [search, setSearch] = useState(filters.search ?? '');
  const { handleSort, handlePerPage } = useTableNav(basePath, filters);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [startYearDialogOpen, setStartYearDialogOpen] = useState(false);
  const [fromYear, setFromYear] = useState(String(year));
  const [toYear, setToYear] = useState(String(year + 1));
  const [busy, setBusy] = useState(false);
  const [clearYearDialogOpen, setClearYearDialogOpen]= useState(false);
  const nextYear = currentYear + 1;
  const nextYearExists = availableYears.includes(nextYear);
  const today = new Date();
  const isFromDecember10 = today.getMonth() === 11 && today.getDate() >= 10; // month is 0-indexed
  const showStartBanner = isFromDecember10 && year === currentYear && !nextYearExists && enrollments.total > 0;

  const handleFilter = (key: string, value: string) => {
    router.get(basePath, { ...filters, [key]: value || undefined }, { preserveState: true });
  };

  const handleSearch = () => handleFilter('search', search);

  const handleCopyYear = () => {
    setBusy(true);
    router.post('/admin/matriculas/copiar-ano', { from_year: fromYear, to_year: toYear }, {
      onSuccess: () => { setCopyDialogOpen(false); setBusy(false); },
      onError:   () => setBusy(false),
    });
  };

  const handleStartYear = () => {
    setBusy(true);
    router.post('/admin/matriculas/iniciar-ano', { new_year: nextYear }, {
      onSuccess: () => { setStartYearDialogOpen(false); setBusy(false); },
      onError:   () => setBusy(false),
    });
  };

  const handleDeleteEnrollment = (id: number, name: string) => {
    if (confirm(`Remover a matrícula de "${name}" em ${year}?`)) {
      router.delete(`/admin/matriculas/${id}`, { preserveScroll: true });
    }
  };

  const handleClearYear = () => {
    setBusy(true);
    router.delete(`/admin/matriculas/ano/${year}`, {
      onSuccess: () => { setClearYearDialogOpen(false); setBusy(false); },
      onError:   () => setBusy(false),
    });
  };

  const clearFilters = () => router.get(basePath, { year: String(year) }, { preserveState: true });
  const hasFilters = !!(filters.search || filters.classroom_id);

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Matrículas' }]}>
      <Head title="Matrículas — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <PageHeader
          title="Matrículas"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setCopyDialogOpen(true)}>
                <Copy className="h-4 w-4" />Copiar entre anos
              </Button>
              {enrollments.total > 0 && (
                <Button size="sm" variant="outline" className="gap-1.5 text-red-600 hover:text-red-700 hover:border-red-300" onClick={() => setClearYearDialogOpen(true)}>
                  <Trash2 className="h-4 w-4" />Apagar {year}
                </Button>
              )}
            </div>
          }
        />

        {/* Start new year banner */}
        {showStartBanner && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <CalendarPlus className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Iniciar ano letivo {nextYear}</p>
                    <p className="text-sm text-blue-700">
                      Copia os {enrollments.total} alunos de {currentYear} para {nextYear} e define {nextYear} como ano atual.
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 gap-1.5 shrink-0"
                  onClick={() => setStartYearDialogOpen(true)}
                >
                  Iniciar {nextYear}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3 items-center">
              <Select value={String(year)} onValueChange={(v) => handleFilter('year', v)}>
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

              <SearchInput
                value={search}
                onChange={setSearch}
                onSearch={handleSearch}
                placeholder="Pesquisar aluno…"
              />

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
              {year === currentYear && (
                <Badge className="ml-2 bg-blue-100 text-blue-700 text-xs font-normal">ano atual</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm admin-table">
                <thead className="border-b border-slate-100 bg-slate-50/50">
                  <tr>
                    <SortableTh label="Aluno" column="student_name" currentSort={filters.sort} currentDir={filters.dir} onSort={handleSort} className="px-6 py-3" />
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Contacto</th>
                    <SortableTh label="Turma" column="classroom_name" currentSort={filters.sort} currentDir={filters.dir} onSort={handleSort} className="px-4 py-3" />
                    <SortableTh label="Inscrito em" column="enrolled_at" currentSort={filters.sort} currentDir={filters.dir} onSort={handleSort} className="px-4 py-3" />
                    <th className="w-10" />
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
                      <td className="px-2 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                          onClick={() => handleDeleteEnrollment(e.id, e.student_name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
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
          onPerPageChange={handlePerPage}
        />
      </div>

      {/* Start new year confirmation dialog */}
      <Dialog open={startYearDialogOpen} onOpenChange={(o) => !o && setStartYearDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Iniciar Ano Letivo {nextYear}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Esta ação irá:
            </p>
            <ul className="text-sm text-slate-600 space-y-1 list-disc pl-4">
              <li>Copiar todos os <strong>{enrollments.total} alunos</strong> matriculados em {currentYear} para {nextYear}</li>
              <li>Definir <strong>{nextYear}</strong> como ano letivo atual</li>
            </ul>
            <p className="text-sm text-slate-500">
              Podes remover alunos que saíram ou adicionar novos depois.
            </p>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" onClick={handleStartYear} disabled={busy}>
                {busy ? 'A processar…' : `Iniciar ${nextYear}`}
              </Button>
              <Button variant="outline" onClick={() => setStartYearDialogOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear year dialog */}
      <Dialog open={clearYearDialogOpen} onOpenChange={(o) => !o && setClearYearDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apagar matrículas de {year}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Serão eliminadas <strong>todas as {enrollments.total} matrículas</strong> do ano {year}. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 pt-1">
              <Button variant="destructive" className="flex-1" onClick={handleClearYear} disabled={busy}>
                {busy ? 'A eliminar…' : `Eliminar tudo de ${year}`}
              </Button>
              <Button variant="outline" onClick={() => setClearYearDialogOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Copy between years dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={(o) => !o && setCopyDialogOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Copiar Matrículas entre Anos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Copia todas as matrículas ativas de um ano para outro. Alunos já inscritos no ano de destino não são duplicados.
            </p>
            <div className="space-y-2">
              <Label>Ano de origem</Label>
              <Select value={fromYear} onValueChange={setFromYear}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Button className="flex-1" onClick={handleCopyYear} disabled={busy || fromYear === toYear}>
                {busy ? 'A copiar…' : 'Copiar matrículas'}
              </Button>
              <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
