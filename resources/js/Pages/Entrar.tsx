import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { AlertCircle, Phone } from 'lucide-react';
import { EntrarPageProps } from '@/types';

export default function Entrar({ errors }: EntrarPageProps) {
  const { data, setData, post, processing } = useForm({ phone: '' });

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    post('/entrar');
  };

  return (
    <PublicLayout>
      <Head title="Entrar — IEADAO Presenças" />
      <div className="w-full max-w-sm">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <Phone className="h-6 w-6 text-slate-600" />
            </div>
            <CardTitle className="text-xl">Entrar</CardTitle>
            <CardDescription>
              Introduz o teu número de telefone para aceder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors?.phone && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.phone}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone">Número de Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="912 345 678"
                  value={data.phone}
                  onChange={(e) => setData('phone', e.target.value)}
                  autoFocus
                  className={errors?.phone ? 'border-red-500' : ''}
                />
              </div>

              <Button type="submit" className="w-full" disabled={processing}>
                {processing ? 'A verificar...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-4 space-y-1 text-center text-xs text-slate-500">
              <p className='mb-4'>
                É aluno e não tem conta?{' '}
                <a href="/registar" className="text-slate-700 underline hover:no-underline">
                  Registar
                </a>
              </p>
              <p>Administrador ou professor?{' '}
                <a href="/login" className="text-slate-700 underline hover:no-underline">
                  Aceder aqui
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}
