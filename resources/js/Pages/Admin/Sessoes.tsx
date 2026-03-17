import { Head, Link, router, useForm } from '@inertiajs/react';
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
import { Plus, QrCode, Play, Square, RefreshCw, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageProps, PaginatedData, StudySession } from '@/types';
import FlashMessage from '@/Components/FlashMessage';

interface Props extends PageProps {
  sessions: PaginatedData<StudySession>;
  classrooms: Array<{ id: number; name: string }>;
}

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-600',
  draft: 'bg-yellow-100 text-yellow-800',
};

export default function Sessoes({ sessions, classrooms }: Props) {
  const [showCreate, setShowCreate] = useState(false);

  const createForm = useForm({
    classroom_id: '',
    title: '',
    session_date: '',
    lesson_type: '',
    notes: '',
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createForm.post('/admin/sessoes', { onSuccess: () => { setShowCreate(false); createForm.reset(); } });
  };

  const handleOpen = (id: number) => router.post(`/admin/sessoes/${id}/abrir`);
  const handleClose = (id: number) => router.post(`/admin/sessoes/${id}/fechar`);
  const handleRegenerate = (id: number) => router.post(`/admin/sessoes/${id}/regenerar-codigo`);
  const handleDelete = (id: number, title: string) => {
    if (confirm(`Eliminar "${title}"?`)) router.delete(`/admin/sessoes/${id}`);
  };

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Sessões' }]}>
      <Head title="Sessões — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Sessões de Estudo</h1>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Sessão</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nova Sessão</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1">
                  <Label>Turma *</Label>
                  <Select value={createForm.data.classroom_id} onValueChange={(v) => createForm.setData('classroom_id', v)}>
                    <SelectTrigger><SelectValue placeholder="Seleciona…" /></SelectTrigger>
                    <SelectContent>
                      {classrooms.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
                  {createForm.processing ? 'A criar…' : 'Criar Sessão'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="px-0 pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>
                    <th className="text-left px-6 py-3 text-slate-500 font-medium">Título</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Data</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden md:table-cell">Turma</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium">Estado</th>
                    <th className="text-left px-4 py-3 text-slate-500 font-medium hidden lg:table-cell">Pres.</th>
                    <th className="text-right px-6 py-3 text-slate-500 font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sessions.data.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium max-w-[12rem] truncate">{s.title}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{s.session_date}</td>
                      <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{s.classroom_name}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[s.status] ?? ''}>{s.status_label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{s.attendances_count}</td>
                      <td className="px-6 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {s.status === 'draft' && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleOpen(s.id)} title="Abrir">
                              <Play className="h-3.5 w-3.5 text-green-600" />
                            </Button>
                          )}
                          {s.status === 'open' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleClose(s.id)} title="Fechar">
                                <Square className="h-3.5 w-3.5 text-slate-600" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRegenerate(s.id)} title="Regenerar código">
                                <RefreshCw className="h-3.5 w-3.5 text-blue-600" />
                              </Button>
                              <Button asChild size="icon" variant="ghost" className="h-7 w-7" title="QR Code">
                                <Link href={`/qr/sessao/${s.id}`}>
                                  <QrCode className="h-3.5 w-3.5 text-purple-600" />
                                </Link>
                              </Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(s.id, s.title)}>
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

        {sessions.last_page > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-slate-500">{sessions.from}–{sessions.to} de {sessions.total}</p>
            <div className="flex gap-2">
              {sessions.links.map((link, i) =>
                link.url ? (
                  <Link key={i} href={link.url}>
                    <Button variant={link.active ? 'default' : 'outline'} size="sm" className="h-8 px-3">
                      {link.label === '&laquo; Previous' ? <ChevronLeft className="h-4 w-4" /> :
                       link.label === 'Next &raquo;' ? <ChevronRight className="h-4 w-4" /> : link.label}
                    </Button>
                  </Link>
                ) : null
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
