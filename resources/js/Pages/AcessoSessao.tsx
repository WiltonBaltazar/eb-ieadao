import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler, useEffect, useState } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { AlertCircle, CheckCircle2, Building2, Calendar, Clock, Phone } from 'lucide-react';
import { AcessoSessaoPageProps, PageProps } from '@/types';

function CountdownBadge({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [urgent, setUrgent] = useState(false);

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expirado');
        setUrgent(true);
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      setUrgent(diff < 60000);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (!timeLeft) return null;

  return (
    <div className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold tabular-nums ${
      urgent
        ? 'bg-red-50 border border-red-200 text-red-700'
        : 'bg-amber-50 border border-amber-200 text-amber-700'
    }`}>
      <Clock className="h-4 w-4" />
      Expira em <span className="text-lg font-bold">{timeLeft}</span>
    </div>
  );
}

export default function AcessoSessao({ session, auth_phone, auth_name }: AcessoSessaoPageProps) {
  const { flash, errors } = usePage<PageProps>().props;

  const { data, setData, post, processing } = useForm({
    phone: auth_phone ?? '',
    code: session.check_in_code ?? '',
  });

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    post(`/check-in/${session.id}`);
  };

  const statusConfig: Record<string, { label: string; bg: string; dot: string }> = {
    open:   { label: 'Aberta', bg: 'bg-green-100 text-green-800', dot: 'bg-green-500' },
    closed: { label: 'Encerrada', bg: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
    draft:  { label: 'Rascunho', bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  };
  const status = statusConfig[session.status] ?? statusConfig.closed;

  return (
    <PublicLayout title={session.title}>
      <Head title={`${session.title} — IEADAO Presenças`} />

      <div className="w-full max-w-sm space-y-4">

        {/* Session card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
          <div className="h-1 bg-brand-primary" />
          <div className="px-5 py-5">
            {/* Status badge */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${status.bg}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.dot} ${session.status === 'open' ? 'animate-pulse' : ''}`} />
                {status.label}
              </span>
              <span className="text-xs text-slate-400">{session.classroom.name}</span>
            </div>

            <h2 className="text-base font-bold text-slate-800 leading-snug mb-3">{session.title}</h2>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Building2 className="h-4 w-4 text-slate-400" />
                {session.classroom.name}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Calendar className="h-4 w-4 text-slate-400" />
                {new Date(session.session_date).toLocaleDateString('pt-PT', {
                  weekday: 'long', day: 'numeric', month: 'long'
                })}
              </div>
            </div>

            {/* Countdown */}
            {session.check_in_code_expires_at && session.status === 'open' && (
              <div className="mt-4">
                <CountdownBadge expiresAt={session.check_in_code_expires_at} />
              </div>
            )}
          </div>
        </div>

        {/* Flash messages */}
        {flash?.success && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3.5">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-sm font-medium text-green-800">{flash.success}</p>
          </div>
        )}
        {flash?.info && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3.5">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-sm font-medium text-blue-800">{flash.info}</p>
          </div>
        )}
        {errors && Object.keys(errors).length > 0 && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5">
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <p className="text-sm font-medium text-red-800">
              {errors.phone ?? errors.code ?? errors.general ?? Object.values(errors)[0]}
            </p>
          </div>
        )}

        {/* Check-in form */}
        {session.status === 'open' ? (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
            <div className="h-1 bg-brand-accent" />
            <div className="px-5 py-5">
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-xl bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/30">
                  <Phone className="h-6 w-6 text-white" />
                </div>
              </div>
              <h3 className="text-base font-bold text-slate-800 text-center">Confirmar Presença</h3>
              {auth_name ? (
                <p className="text-sm text-slate-400 text-center mt-1 mb-5">
                  Bem-vindo, <strong className="text-slate-700">{auth_name}</strong>
                </p>
              ) : (
                <p className="text-sm text-slate-400 text-center mt-1 mb-5">
                  Introduz o teu número de telefone
                </p>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Telefone
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">
                      +244
                    </span>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9XXXXXXXX"
                      value={data.phone}
                      onChange={(e) => setData('phone', e.target.value)}
                      autoFocus={!auth_phone}
                      className="pl-14 h-11 rounded-xl border-slate-200 focus:border-brand-accent focus:ring-brand-accent/20"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={processing}
                  className="w-full h-11 rounded-xl bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold shadow-lg shadow-brand-accent/25"
                >
                  {processing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      A confirmar...
                    </span>
                  ) : 'Confirmar Presença'}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 px-5 py-6 text-center">
            <p className="text-sm text-slate-500">Esta aula não está aberta para presenças.</p>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 pb-2">
          <Link href="/entrar" className="text-slate-500 font-medium hover:text-slate-700 underline underline-offset-2">
            Entrar na minha conta
          </Link>
        </p>
      </div>
    </PublicLayout>
  );
}
