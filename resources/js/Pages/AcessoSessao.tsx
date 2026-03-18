import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { AlertCircle, CheckCircle2, Calendar, Building2, Clock } from 'lucide-react';
import { AcessoSessaoPageProps, PageProps } from '@/types';

export default function AcessoSessao({ session, auth_phone, auth_name }: AcessoSessaoPageProps) {
  const { flash, errors } = usePage<PageProps>().props;
  const [timeLeft, setTimeLeft] = useState<string>('');

  const { data, setData, post, processing } = useForm({
    phone: auth_phone ?? '',
    code: session.check_in_code ?? '',
  });

  // Countdown timer
  useEffect(() => {
    if (!session.check_in_code_expires_at) return;

    const update = () => {
      const diff = new Date(session.check_in_code_expires_at!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expirado');
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [session.check_in_code_expires_at]);

  const statusColor: Record<string, string> = {
    open: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-600',
    draft: 'bg-yellow-100 text-yellow-800',
  };

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    post(`/check-in/${session.id}`);
  };

  return (
    <PublicLayout title={session.title}>
      <Head title={`${session.title} — IEADAO Presenças`} />
      <div className="w-full max-w-sm space-y-4">
        {/* Session Info */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">{session.title}</CardTitle>
              <Badge className={statusColor[session.status] ?? ''}>{session.status_label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>{session.classroom.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{new Date(session.session_date).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            {timeLeft && session.status === 'open' && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Código expira em: <strong>{timeLeft}</strong></span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Flash messages */}
        {flash?.success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>{flash.success}</AlertDescription>
          </Alert>
        )}
        {flash?.info && (
          <Alert className="border-blue-200 bg-blue-50 text-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription>{flash.info}</AlertDescription>
          </Alert>
        )}
        {errors && Object.keys(errors).length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {errors.phone ?? errors.code ?? errors.general ?? Object.values(errors)[0]}
            </AlertDescription>
          </Alert>
        )}

        {/* Check-in Form */}
        {session.status === 'open' && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Confirmar Presença</CardTitle>
              {auth_name && (
                <p className="text-sm text-slate-500">Bem-vindo, <strong>{auth_name}</strong></p>
              )}
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Número de Telefone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="912 345 678"
                    value={data.phone}
                    onChange={(e) => setData('phone', e.target.value)}
                    autoFocus={!auth_phone}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={processing}>
                  {processing ? 'A confirmar...' : 'Confirmar Presença'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {session.status !== 'open' && (
          <Card>
            <CardContent className="py-6 text-center text-slate-500">
              <p>Esta sessão não está aberta para presenças.</p>
            </CardContent>
          </Card>
        )}
        <p className="text-center text-sm text-slate-400">
          <Link href="/entrar" className="text-slate-500 hover:text-slate-700 underline underline-offset-2">
            Entrar na minha conta
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}
