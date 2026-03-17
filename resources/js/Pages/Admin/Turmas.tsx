import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
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
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { PageProps, Classroom } from '@/types';
import FlashMessage from '@/Components/FlashMessage';

interface Props extends PageProps {
  classrooms: Classroom[];
  teachers: Array<{ id: number; name: string }>;
}

export default function Turmas({ classrooms, teachers }: Props) {
  const [editItem, setEditItem] = useState<Classroom | null>(null);

  const createForm = useForm({
    name: '',
    description: '',
    teacher_id: '',
    meeting_day: '',
    meeting_time: '',
    is_active: false,
  });

  const editForm = useForm({
    name: '',
    description: '',
    teacher_id: '',
    meeting_day: '',
    meeting_time: '',
    is_active: false,
  });

  const openEdit = (c: Classroom) => {
    setEditItem(c);
    editForm.setData({
      name: c.name,
      description: c.description ?? '',
      teacher_id: c.teacher_id ? String(c.teacher_id) : '',
      meeting_day: c.meeting_day ?? '',
      meeting_time: c.meeting_time ?? '',
      is_active: c.is_active,
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createForm.post('/admin/turmas', { onSuccess: () => createForm.reset() });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    editForm.put(`/admin/turmas/${editItem.id}`, { onSuccess: () => setEditItem(null) });
  };

  const handleDelete = (c: Classroom) => {
    if (confirm(`Eliminar turma "${c.name}"?`)) {
      router.delete(`/admin/turmas/${c.id}`);
    }
  };

  type ClassroomFormData = {
    name: string;
    description: string;
    teacher_id: string;
    meeting_day: string;
    meeting_time: string;
    is_active: boolean;
  };

  const ClassroomForm = ({
    form,
    onSubmit,
    submitLabel,
  }: {
    form: ReturnType<typeof useForm<ClassroomFormData>>;
    onSubmit: (e: React.FormEvent) => void;
    submitLabel: string;
  }) => (
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
        <Label>Professor</Label>
        <Select value={form.data.teacher_id} onValueChange={(v) => form.setData('teacher_id', v)}>
          <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {teachers.map((t) => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
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

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Turmas' }]}>
      <Head title="Turmas — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">Turmas</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Turma</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Nova Turma</DialogTitle></DialogHeader>
              <ClassroomForm form={createForm} onSubmit={handleCreate} submitLabel="Criar Turma" />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {classrooms.map((c) => (
            <Card key={c.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-800">{c.name}</h3>
                      {c.is_active && <Badge className="bg-green-100 text-green-800 text-xs">Ativa</Badge>}
                    </div>
                    {c.description && <p className="text-sm text-slate-500 mt-1">{c.description}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                      {c.teacher_name && <span>👤 {c.teacher_name}</span>}
                      {c.meeting_day && <span>📅 {c.meeting_day} {c.meeting_time}</span>}
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{c.students_count ?? 0} alunos</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Dialog open={editItem?.id === c.id} onOpenChange={(o) => !o && setEditItem(null)}>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader><DialogTitle>Editar Turma</DialogTitle></DialogHeader>
                        <ClassroomForm form={editForm} onSubmit={handleEdit} submitLabel="Guardar" />
                      </DialogContent>
                    </Dialog>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(c)}>
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
