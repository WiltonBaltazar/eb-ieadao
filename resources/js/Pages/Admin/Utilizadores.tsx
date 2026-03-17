import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
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
import { Plus, Search, Trash2, AlertCircle } from 'lucide-react';
import { PageProps, PaginatedData } from '@/types';
import FlashMessage from '@/Components/FlashMessage';

interface UserRow {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  role: string;
  role_label: string;
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

export default function Utilizadores({ users, classrooms, roles, gruposOptions, filters, errors }: Props) {
  const [search, setSearch] = useState(filters.search ?? '');
  const [showCreate, setShowCreate] = useState(false);

  const handleSearch = () => {
    router.get('/admin/utilizadores', { ...filters, search }, { preserveState: true });
  };

  const handleFilter = (key: string, value: string) => {
    router.get('/admin/utilizadores', { ...filters, [key]: value }, { preserveState: true });
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

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Utilizadores' }]}>
      <Head title="Utilizadores — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Utilizadores</h1>
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
                {createForm.data.role === 'student' && (
                  <>
                    <div className="space-y-1">
                      <Label>Telefone *</Label>
                      <Input type="tel" value={createForm.data.phone} onChange={(e) => createForm.setData('phone', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Grupo Homogéneo</Label>
                      <Select value={createForm.data.grupo_homogeneo} onValueChange={(v) => createForm.setData('grupo_homogeneo', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleciona…" /></SelectTrigger>
                        <SelectContent>
                          {gruposOptions.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Turma</Label>
                      <Select value={createForm.data.classroom_id} onValueChange={(v) => createForm.setData('classroom_id', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleciona…" /></SelectTrigger>
                        <SelectContent>
                          {classrooms.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
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
              <Select value={filters.role ?? ''} onValueChange={(v) => handleFilter('role', v)}>
                <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Todos os papéis" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {roles.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filters.classroom_id ?? ''} onValueChange={(v) => handleFilter('classroom_id', v)}>
                <SelectTrigger className="h-8 w-36"><SelectValue placeholder="Todas as turmas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {classrooms.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="px-0 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Nome</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Contacto</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Papel</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Turma</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Grupo</th>
                    <th className="text-right px-6 py-3 text-slate-500 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.data.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
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
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleDelete(u.id, u.name)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-red-400" />
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

        <p className="text-sm text-slate-500 text-center">{users.total} utilizadores</p>
      </div>
    </AdminLayout>
  );
}
