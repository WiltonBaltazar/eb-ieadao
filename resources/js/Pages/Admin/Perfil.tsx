import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { AlertCircle } from 'lucide-react';
import { PageProps } from '@/types';
import FlashMessage from '@/Components/FlashMessage';

interface Props extends PageProps {
  profile: {
    name: string;
    email: string;
    role: string;
    phone: string | null;
    grupo_homogeneo: string | null;
  };
  gruposOptions?: Array<{ value: string; label: string }>;
}

export default function Perfil({ profile, gruposOptions, errors }: Props) {
  const isTeacher = profile.role === 'teacher';

  const form = useForm({
    name: profile.name,
    email: profile.email,
    phone: profile.phone ?? '',
    grupo_homogeneo: profile.grupo_homogeneo ?? '',
    password: '',
    password_confirmation: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    form.put('/admin/perfil', {
      preserveScroll: true,
      onSuccess: () => {
        form.setData('password', '');
        form.setData('password_confirmation', '');
      },
    });
  };

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Meu Perfil' }]}>
      <Head title="Meu Perfil — IEADAO" />
      <FlashMessage />

      <div className="max-w-lg space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Meu Perfil</h1>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados Pessoais</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors && Object.keys(errors).length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{Object.values(errors)[0]}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label>Nome</Label>
                <Input
                  value={form.data.name}
                  onChange={(e) => form.setData('name', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.data.email}
                  onChange={(e) => form.setData('email', e.target.value)}
                  required
                />
              </div>

              {isTeacher && (
                <>
                  <div className="space-y-1">
                    <Label>Telefone (Whatsapp)</Label>
                    <Input
                      type="tel"
                      value={form.data.phone}
                      onChange={(e) => form.setData('phone', e.target.value)}
                    />
                  </div>
                  {gruposOptions && (
                    <div className="space-y-1">
                      <Label>Grupo Homogéneo</Label>
                      <Select value={form.data.grupo_homogeneo} onValueChange={(v) => form.setData('grupo_homogeneo', v)}>
                        <SelectTrigger><SelectValue placeholder="Seleciona…" /></SelectTrigger>
                        <SelectContent>
                          {gruposOptions.map((g) => <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-500 mb-3">Deixa em branco para manter a password atual.</p>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Nova Password</Label>
                    <Input
                      type="password"
                      value={form.data.password}
                      onChange={(e) => form.setData('password', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Confirmar Password</Label>
                    <Input
                      type="password"
                      value={form.data.password_confirmation}
                      onChange={(e) => form.setData('password_confirmation', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={form.processing} className="w-full">
                {form.processing ? 'A guardar...' : 'Guardar Alterações'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
