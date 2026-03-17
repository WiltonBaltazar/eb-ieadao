import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { EditarPerfilPageProps, PageProps } from '@/types';

export default function EditarPerfil({ student, gruposOptions, errors }: EditarPerfilPageProps) {
  const { flash } = usePage<PageProps>().props;
  const { data, setData, put, processing } = useForm({
    name: student.name ?? '',
    phone: student.phone ?? '',
    whatsapp: student.whatsapp ?? '',
    alt_contact: student.alt_contact ?? '',
    grupo_homogeneo: student.grupo_homogeneo ?? '',
  });

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    put('/perfil/editar');
  };

  return (
    <StudentLayout>
      <Head title="Editar Perfil — IEADAO Presenças" />

      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Editar Perfil</h1>

        {flash?.success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>{flash.success}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Informação Pessoal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  className={errors?.name ? 'border-red-500' : ''}
                />
                {errors?.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={data.phone}
                  onChange={(e) => setData('phone', e.target.value)}
                  className={errors?.phone ? 'border-red-500' : ''}
                />
                {errors?.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  type="tel"
                  value={data.whatsapp}
                  onChange={(e) => setData('whatsapp', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="alt_contact">Contacto Alternativo</Label>
                <Input
                  id="alt_contact"
                  value={data.alt_contact}
                  onChange={(e) => setData('alt_contact', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grupo_homogeneo">Grupo Homogéneo</Label>
                <Select
                  value={data.grupo_homogeneo}
                  onValueChange={(v) => setData('grupo_homogeneo', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleciona o teu grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {gruposOptions.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Read-only classroom */}
              <div className="space-y-2">
                <Label>Turma</Label>
                <Input
                  value={student.classroom_name ?? 'Sem turma atribuída'}
                  disabled
                  className="bg-slate-50 text-slate-500"
                />
                <p className="text-xs text-slate-400">A turma só pode ser alterada pelo administrador.</p>
              </div>

              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? 'A guardar...' : 'Guardar Alterações'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
