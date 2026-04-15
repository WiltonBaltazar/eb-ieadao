import { Head, Link, router, useForm } from '@inertiajs/react';
import { useState, useRef } from 'react';
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
  DialogTrigger,
} from '@/Components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Plus, Search, Trash2, AlertCircle, Eye, Pencil, Upload, FileSpreadsheet, X, Loader2 } from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import FlashMessage from '@/Components/FlashMessage';
import { SortableTh, TablePagination, useTableNav } from '@/Components/AdminTable';

interface UserRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  alt_contact: string | null;
  role: string;
  role_label: string;
  classroom_id: number | null;
  classroom_name: string | null;
  grupo_homogeneo: string | null;
  grupo_homogeneo_label: string | null;
  attendance_rate: number | null;
}

interface Props extends PageProps {
  users: PaginatedData<UserRow>;
  classrooms: Array<{ id: number; name: string }>;
  roles: Array<{ value: string; label: string }>;
  gruposOptions: Array<{ value: string; label: string }>;
  filters: Record<string, string>;
}

const roleColors: Record<string, string> = {
  admin: 'bg-red-100 text-red-800',
  teacher: 'bg-blue-100 text-blue-800',
  student: 'bg-green-100 text-green-800',
};

export default function Utilizadores({ users, classrooms, roles, gruposOptions, filters, errors, auth }: Props) {
  const isAdmin = auth.user?.role === 'admin';
  const [search, setSearch] = useState(filters.search ?? '');
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const { handleSort: baseHandleSort, handlePerPage: baseHandlePerPage } = useTableNav('/admin/utilizadores', filters);
  const { selectedIds, selectedCount, isAllSelected, isIndeterminate, isSelected, toggleOne, toggleAll, clearSelection } = useBulkSelect(users.data);

  const handleSort = (col: string, dir: string) => { clearSelection(); baseHandleSort(col, dir); };
  const handlePerPage = (n: number) => { clearSelection(); baseHandlePerPage(n); };

  const handleBulkDelete = () => {
    router.post('/admin/utilizadores/bulk-destroy', { ids: selectedIds }, {
      onSuccess: () => clearSelection(),
    });
  };

  const handleSearch = () => {
    router.get('/admin/utilizadores', { ...filters, search }, { preserveState: true });
  };

  const handleFilter = (key: string, value: string) => {
    router.get('/admin/utilizadores', { ...filters, [key]: value }, { preserveState: true });
  };

  const [newRole, setNewRole]       = useState('');
  const [changingRole, setChangingRole] = useState(false);

  const editForm = useForm({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    alt_contact: '',
    grupo_homogeneo: '',
    classroom_id: '',
    password: '',
  });

  const openEdit = (u: UserRow) => {
    setEditUser(u);
    setNewRole(u.role);
    editForm.setData({
      name: u.name,
      email: u.email ?? '',
      phone: u.phone ?? '',
      whatsapp: u.whatsapp ?? '',
      alt_contact: u.alt_contact ?? '',
      grupo_homogeneo: u.grupo_homogeneo ?? '',
      classroom_id: u.classroom_id ? String(u.classroom_id) : '',
      password: '',
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    editForm.put(`/admin/utilizadores/${editUser.id}`, {
      onSuccess: () => setEditUser(null),
    });
  };

  const handleUpdateRole = () => {
    if (!editUser || !newRole || newRole === editUser.role) return;
    setChangingRole(true);
    router.patch(
      `/admin/utilizadores/${editUser.id}/papel`,
      { role: newRole },
      {
        onSuccess: () => { setEditUser(null); setChangingRole(false); },
        onError:   () => setChangingRole(false),
      },
    );
  };

  const createForm = useForm({
    name: '',
    email: '',
    password: '',
    phone: '',
    whatsapp: '',
    role: 'student',
    classroom_id: '',
    grupo_homogeneo: '',
    alt_contact: '',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createForm.post('/admin/utilizadores', {
      onSuccess: () => { setShowCreate(false); createForm.reset(); },
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Eliminar utilizador "${name}"?`)) {
      router.delete(`/admin/utilizadores/${id}`);
    }
  };

  // ── Mapa ICI import ──
  type MapaResult = { students_created: number; students_updated: number; sessions_created: number; attendances_created: number; skipped: number; errors: string[]; error?: string };
  const [showMapaImport, setShowMapaImport]   = useState(false);
  const [mapaFile, setMapaFile]               = useState<File | null>(null);
  const [mapaClassroom, setMapaClassroom]     = useState('');
  const [mapaImporting, setMapaImporting]     = useState(false);
  const [mapaResult, setMapaResult]           = useState<MapaResult | null>(null);
  const mapaInputRef = useRef<HTMLInputElement>(null);

  const openMapaImport = () => {
    setMapaFile(null);
    setMapaResult(null);
    setMapaClassroom('');
    setShowMapaImport(true);
    if (mapaInputRef.current) mapaInputRef.current.value = '';
  };

  const submitMapaImport = () => {
    if (!mapaFile || !mapaClassroom) return;
    setMapaImporting(true);
    setMapaResult(null);
    const formData = new FormData();
    formData.append('xlsx', mapaFile);
    formData.append('classroom_id', mapaClassroom);
    formData.append('_token', (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '');
    fetch('/admin/utilizadores/importar-mapa-ici', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      body: formData,
    })
      .then((r) => r.json())
      .then((data) => {
        setMapaResult(data);
        setMapaImporting(false);
        if (!data.error) router.reload();
      })
      .catch(() => setMapaImporting(false));
  };

  // ── XLSX import ──
  const [showImport, setShowImport]         = useState(false);
  const [importFile, setImportFile]         = useState<File | null>(null);
  const [importClassroom, setImportClassroom] = useState('');
  const [importing, setImporting]           = useState(false);
  const [importResult, setImportResult]     = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const xlsxInputRef = useRef<HTMLInputElement>(null);

  const openImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImportClassroom('');
    setShowImport(true);
    if (xlsxInputRef.current) xlsxInputRef.current.value = '';
  };

  const submitImport = () => {
    if (!importFile || !importClassroom) return;
    setImporting(true);
    setImportResult(null);
    const formData = new FormData();
    formData.append('xlsx', importFile);
    formData.append('classroom_id', importClassroom);
    formData.append('_token', (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '');
    fetch('/admin/utilizadores/importar-alunos', {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
      body: formData,
    })
      .then((r) => r.json())
      .then((data) => {
        setImportResult(data);
        setImporting(false);
        if (!data.error) router.reload();
      })
      .catch(() => setImporting(false));
  };

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Utilizadores' }]}>
      <Head title="Utilizadores — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Utilizadores</h1>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={openMapaImport}>
              <FileSpreadsheet className="h-4 w-4" />
              Importar Mapa ICI
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-indigo-700 border-indigo-300 hover:bg-indigo-50" onClick={openImport}>
              <Upload className="h-4 w-4" />
              Importar XLSX
            </Button>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Utilizador
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Utilizador</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                {errors && Object.keys(errors).length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{Object.values(errors)[0]}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1">
                  <Label>Papel</Label>
                  <Select value={createForm.data.role} onValueChange={(v) => createForm.setData('role', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input value={createForm.data.name} onChange={(e) => createForm.setData('name', e.target.value)} required />
                </div>
                {createForm.data.role !== 'student' && (
                  <>
                    <div className="space-y-1">
                      <Label>Email *</Label>
                      <Input type="email" value={createForm.data.email} onChange={(e) => createForm.setData('email', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Password *</Label>
                      <Input type="password" value={createForm.data.password} onChange={(e) => createForm.setData('password', e.target.value)} />
                    </div>
                  </>
                )}
                {(createForm.data.role === 'student' || createForm.data.role === 'teacher') && (
                  <>
                    <div className="space-y-1">
                      <Label>{createForm.data.role === 'student' ? 'Telefone *' : 'Telefone (Whatsapp)'}</Label>
                      <Input type="tel" value={createForm.data.phone} onChange={(e) => createForm.setData('phone', e.target.value)} />
                    </div>
                  </>
                )}
                {(createForm.data.role === 'student' || createForm.data.role === 'teacher') && (
                  <>
                    <div className="space-y-1">
                      <Label>Grupo Homogéneo</Label>
                      <Select value={createForm.data.grupo_homogeneo} onValueChange={(v) => createForm.setData('grupo_homogeneo', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleciona…" /></SelectTrigger>
                        <SelectContent>
                          {gruposOptions.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {(createForm.data.role === 'student' || createForm.data.role === 'teacher') && (
                  <div className="space-y-1">
                    <Label>Turma</Label>
                    <Select value={createForm.data.classroom_id} onValueChange={(v) => createForm.setData('classroom_id', v)}>
                      <SelectTrigger><SelectValue placeholder="Seleciona…" /></SelectTrigger>
                      <SelectContent>
                        {classrooms.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button type="submit" className="flex-1" disabled={createForm.processing}>
                    {createForm.processing ? 'A criar…' : 'Criar'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2 flex-1 min-w-[12rem]">
                <Input
                  placeholder="Pesquisar…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="h-8"
                />
                <Button size="sm" variant="outline" onClick={handleSearch} className="h-8">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Select value={filters.role ?? 'all'} onValueChange={(v) => handleFilter('role', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Todos os papéis" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {roles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.classroom_id ?? 'all'} onValueChange={(v) => handleFilter('classroom_id', v === 'all' ? '' : v)}>
                <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Todas as turmas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {classrooms.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
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
              totalOnPage={users.data.length}
              label="utilizadores"
              onConfirmDelete={handleBulkDelete}
              onClear={clearSelection}
              onSelectAll={toggleAll}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm admin-table">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="bg-slate-50/80 w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={(el) => { if (el) el.indeterminate = isIndeterminate; }}
                        onChange={toggleAll}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 cursor-pointer"
                      />
                    </th>
                    <SortableTh label="Nome" column="name" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="px-6" />
                    <SortableTh label="Contacto" column="phone" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} className="hidden md:table-cell" />
                    <SortableTh label="Papel" column="role" currentSort={filters.sort_by} currentDir={filters.sort_dir} onSort={handleSort} />
                    <th className="bg-slate-50/80 text-left px-4 py-3 text-slate-600 font-semibold text-xs uppercase tracking-wide hidden lg:table-cell">Turma</th>
                    <th className="bg-slate-50/80 text-left px-4 py-3 text-slate-600 font-semibold text-xs uppercase tracking-wide hidden lg:table-cell">Grupo</th>
                    <th className="bg-slate-50/80 text-right px-6 py-3 text-slate-600 font-semibold text-xs uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.data.map((u) => (
                    <tr key={u.id} className={isSelected(u.id) ? 'bg-blue-50/40' : 'hover:bg-slate-50'}>
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected(u.id)}
                          onChange={() => toggleOne(u.id)}
                          className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                        {u.phone ?? u.email ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={roleColors[u.role] ?? ''}>{u.role_label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                        {u.classroom_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs hidden lg:table-cell">
                        {u.grupo_homogeneo_label ?? '—'}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {u.attendance_rate !== null && (
                            <span className="text-xs text-slate-400 mr-2">{u.attendance_rate}%</span>
                          )}
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-slate-600">
                            <Link href={`/admin/utilizadores/${u.id}`}>
                              <Eye className="h-3.5 w-3.5" />Ver
                            </Link>
                          </Button>
                          {isAdmin && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-slate-600" onClick={() => openEdit(u)}>
                              <Pencil className="h-3.5 w-3.5" />Editar
                            </Button>
                          )}
                          {isAdmin && (
                            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1 text-xs text-red-500" onClick={() => handleDelete(u.id, u.name)}>
                              <Trash2 className="h-3.5 w-3.5" />Eliminar
                            </Button>
                          )}
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
          data={users}
          currentPath="/admin/utilizadores"
          params={filters}
          onPerPageChange={handlePerPage}
        />
      </div>
      {/* Edit dialog — admin only */}
      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Utilizador</DialogTitle>
          </DialogHeader>
          {editUser && (
            <form onSubmit={handleEdit} className="space-y-3">
              {editForm.errors && Object.keys(editForm.errors).length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{Object.values(editForm.errors)[0]}</AlertDescription>
                </Alert>
              )}

              {/* Role management */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <Label className="text-xs uppercase tracking-wide text-slate-500">Papel do utilizador</Label>
                <div className="flex items-center gap-2">
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 shrink-0"
                    disabled={changingRole || newRole === editUser.role}
                    onClick={handleUpdateRole}
                  >
                    {changingRole ? 'A guardar…' : 'Guardar papel'}
                  </Button>
                </div>
                {newRole !== editUser.role && (
                  <p className="text-xs text-amber-600">
                    A alterar de <strong>{roles.find((r) => r.value === editUser.role)?.label}</strong> para <strong>{roles.find((r) => r.value === newRole)?.label}</strong>
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={editForm.data.name} onChange={(e) => editForm.setData('name', e.target.value)} required />
              </div>
              {editUser.role !== 'student' && (
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={editForm.data.email} onChange={(e) => editForm.setData('email', e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <Label>Telefone</Label>
                <Input type="tel" value={editForm.data.phone} onChange={(e) => editForm.setData('phone', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Contacto alternativo</Label>
                <Input value={editForm.data.alt_contact} onChange={(e) => editForm.setData('alt_contact', e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Grupo Homogéneo</Label>
                <Select
                  value={editForm.data.grupo_homogeneo || '_none_'}
                  onValueChange={(v) => editForm.setData('grupo_homogeneo', v === '_none_' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Seleciona…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">—</SelectItem>
                    {gruposOptions.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Turma</Label>
                <Select
                  value={editForm.data.classroom_id || '_none_'}
                  onValueChange={(v) => editForm.setData('classroom_id', v === '_none_' ? '' : v)}
                >
                  <SelectTrigger><SelectValue placeholder="Sem turma" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none_">Sem turma</SelectItem>
                    {classrooms.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {editUser.role !== 'student' && (
                <div className="space-y-1">
                  <Label>Nova password <span className="text-slate-400 font-normal">(deixar em branco para manter)</span></Label>
                  <Input type="password" value={editForm.data.password} onChange={(e) => editForm.setData('password', e.target.value)} autoComplete="new-password" />
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1" disabled={editForm.processing}>
                  {editForm.processing ? 'A guardar…' : 'Guardar'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Mapa ICI Import Modal ── */}
      {showMapaImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                Importar Mapa ICI
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowMapaImport(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700">Ficheiro ICI — folha "MAPA GERAL"</p>
              <p>Importa alunos (NOME + contacto), cria aulas com os números dados e regista presenças (P).</p>
              <p>Login: usa o número WA se disponível, senão o CONTACTO. Alunos já existentes (mesmo número) são actualizados.</p>
            </div>

            {mapaResult ? (
              <div className="space-y-3">
                {mapaResult.error ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{mapaResult.error}</AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                      <p className="text-2xl font-bold text-green-700">{mapaResult.students_created}</p>
                      <p className="text-xs text-green-600">alunos criados</p>
                    </div>
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-center">
                      <p className="text-2xl font-bold text-blue-700">{mapaResult.students_updated}</p>
                      <p className="text-xs text-blue-600">alunos actualizados</p>
                    </div>
                    <div className="rounded-lg bg-violet-50 border border-violet-200 p-3 text-center">
                      <p className="text-2xl font-bold text-violet-700">{mapaResult.sessions_created}</p>
                      <p className="text-xs text-violet-600">aulas criadas</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                      <p className="text-2xl font-bold text-amber-700">{mapaResult.attendances_created}</p>
                      <p className="text-xs text-amber-600">presenças registadas</p>
                    </div>
                  </div>
                )}
                {mapaResult.errors && mapaResult.errors.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1 max-h-40 overflow-y-auto">
                    <p className="text-xs font-medium text-amber-700">Avisos ({mapaResult.skipped} ignorados):</p>
                    {mapaResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-amber-600">{err}</p>
                    ))}
                  </div>
                )}
                <Button className="w-full" onClick={() => setShowMapaImport(false)}>Fechar</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm mb-1.5 block">Turma *</Label>
                  <Select value={mapaClassroom} onValueChange={setMapaClassroom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar turma…" />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Ficheiro Excel (Mapa ICI) *</Label>
                  <input
                    ref={mapaInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                    onChange={(e) => setMapaFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={!mapaFile || !mapaClassroom || mapaImporting}
                    onClick={submitMapaImport}
                  >
                    {mapaImporting
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />A importar…</>
                      : <><FileSpreadsheet className="h-4 w-4 mr-1.5" />Importar</>
                    }
                  </Button>
                  <Button variant="outline" onClick={() => setShowMapaImport(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── XLSX Import Modal ── */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-500" />
                Importar alunos via XLSX
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowImport(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700">Colunas obrigatórias:</p>
              <code className="block text-indigo-700">name · phone · grupo_homogeneo (opcional)</code>
              <p>Todos os alunos do ficheiro são matriculados na turma seleccionada. Alunos já existentes (mesmo telefone) são ignorados.</p>
              <a
                href="/admin/utilizadores/template-alunos"
                className="inline-flex items-center gap-1 text-indigo-600 hover:underline mt-1"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Descarregar template .xlsx
              </a>
            </div>

            {importResult ? (
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1 rounded-lg bg-green-50 border border-green-200 p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{importResult.created}</p>
                    <p className="text-xs text-green-600">criados</p>
                  </div>
                  <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                    <p className="text-2xl font-bold text-slate-600">{importResult.skipped}</p>
                    <p className="text-xs text-slate-500">já existiam</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1">
                    <p className="text-xs font-medium text-amber-700">Avisos:</p>
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-amber-600">{err}</p>
                    ))}
                  </div>
                )}
                <Button className="w-full" onClick={() => setShowImport(false)}>Fechar</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-sm mb-1.5 block">Turma *</Label>
                  <Select value={importClassroom} onValueChange={setImportClassroom}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar turma…" />
                    </SelectTrigger>
                    <SelectContent>
                      {classrooms.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Ficheiro XLSX *</Label>
                  <input
                    ref={xlsxInputRef}
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-slate-300 file:text-xs file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                    onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                    disabled={!importFile || !importClassroom || importing}
                    onClick={submitImport}
                  >
                    {importing
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-1.5" />A importar…</>
                      : <><Upload className="h-4 w-4 mr-1.5" />Importar</>
                    }
                  </Button>
                  <Button variant="outline" onClick={() => setShowImport(false)}>Cancelar</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
