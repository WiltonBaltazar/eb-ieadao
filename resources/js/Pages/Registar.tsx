import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { AlertCircle } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import { RegistarPageProps } from '@/types';

export default function Registar({
  studySession,
  prefillPhone,
  classrooms,
  gruposOptions,
  errors,
}: RegistarPageProps) {
  const { data, setData, post, processing } = useForm({
    name: '',
    phone: prefillPhone ?? '',
    alt_contact: '',
    grupo_homogeneo: '',
    classroom_id: studySession?.classroom_id ? String(studySession.classroom_id) : '',
  });

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    if (studySession) {
      post(`/registar/${studySession.id}`);
    } else {
      post('/registar');
    }
  };

  return (
    <PublicLayout title="Novo Registo">
      <Head title="Registar — IEADAO Presenças" />
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Criar Conta</CardTitle>
            <CardDescription>
              {studySession
                ? <>Preenche os teus dados para confirmar a presença em{' '}<strong>{studySession.title}</strong></>
                : 'Preenche os teus dados para criar a tua conta.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors && Object.keys(errors).length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {Object.values(errors)[0]}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  value={data.name}
                  onChange={(e) => setData('name', e.target.value)}
                  placeholder="João Silva"
                  className={errors?.name ? 'border-red-500' : ''}
                />
                {errors?.name && <p className="text-xs text-red-600">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={data.phone}
                  onChange={(e) => setData('phone', e.target.value)}
                  placeholder="840000000"
                  className={errors?.phone ? 'border-red-500' : ''}
                />
                {errors?.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="alt_contact">Contacto Alternativo <span className="text-slate-400">(opcional)</span></Label>
                <Input
                  id="alt_contact"
                  value={data.alt_contact}
                  onChange={(e) => setData('alt_contact', e.target.value)}
                  placeholder="Email, outro telefone…"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grupo_homogeneo">Grupo Homogéneo *</Label>
                <Select
                  value={data.grupo_homogeneo}
                  onValueChange={(v) => setData('grupo_homogeneo', v)}
                >
                  <SelectTrigger className={errors?.grupo_homogeneo ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleciona o teu grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    {gruposOptions.map((g) => (
                      <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors?.grupo_homogeneo && (
                  <p className="text-xs text-red-600">{errors.grupo_homogeneo}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="classroom_id">Turma *</Label>
                <Select
                  value={data.classroom_id}
                  onValueChange={(v) => setData('classroom_id', v)}
                >
                  <SelectTrigger className={errors?.classroom_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Seleciona a tua turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}{c.teacher_name ? ` — ${c.teacher_name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors?.classroom_id && (
                  <p className="text-xs text-red-600">{errors.classroom_id}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? 'A registar...' : studySession ? 'Registar e Confirmar Presença' : 'Criar Conta'}
              </Button>
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-center text-xs text-slate-400">
                <p>
                  Aluno?{' '}
                  <a href="/entrar" className="text-brand-primary font-semibold hover:underline">
                    Aceder aqui
                  </a>
                </p>
                <p>
                  Administrador?{' '}
                  <a href="/login" className="text-slate-500 hover:text-slate-700 hover:underline">
                    Aceder aqui
                  </a>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PublicLayout >
  );
}
