import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Phone, AlertCircle } from 'lucide-react';
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
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
          {/* Card header strip */}
          <div className="h-1 bg-brand-accent" />

          <div className="px-6 pt-6 pb-7">
            {/* Icon */}
            <div className="flex justify-center mb-5">
              <div className="h-14 w-14 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/30">
                <Phone className="h-7 w-7 text-white" />
              </div>
            </div>

            <h1 className="text-xl font-bold text-slate-800 text-center">Entrar</h1>
            <p className="text-sm text-slate-400 text-center mt-1 mb-6">
              Introduz o teu número de telefone
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {errors?.phone && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errors.phone}</span>
                </div>
              )}

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
                    autoFocus
                    className={`pl-14 h-11 rounded-xl border-slate-200 focus:border-brand-primary focus:ring-brand-primary/20 ${errors?.phone ? 'border-red-400' : ''}`}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={processing}
                className="w-full h-11 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-sm shadow-lg shadow-brand-primary/25 transition-all"
              >
                {processing ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    A verificar...
                  </span>
                ) : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 space-y-2 text-center text-xs text-slate-400">
              <p>
                Aluno sem conta?{' '}
                <a href="/registar" className="text-brand-primary font-semibold hover:underline">
                  Registar
                </a>
              </p>
              <p>
                Administrador?{' '}
                <a href="/login" className="text-slate-500 hover:text-slate-700 hover:underline">
                  Aceder aqui
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
