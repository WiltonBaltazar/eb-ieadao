import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false as boolean,
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <PublicLayout>
            <Head title="Acesso Administrativo — IEADAO" />

            <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
                    {/* Card header strip */}
                    <div className="h-1 bg-brand-accent" />

                    <div className="px-6 pt-6 pb-7">
                        {/* Icon */}
                        <div className="flex justify-center mb-5">
                            <div className="h-14 w-14 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/30">
                                <Lock className="h-6 w-6 text-white" />
                            </div>
                        </div>

                        <h1 className="text-xl font-bold text-slate-800 text-center">Acesso Administrativo</h1>
                        <p className="text-sm text-slate-400 text-center mt-1 mb-6">
                            Área reservada a administradores
                        </p>

                        {status && (
                            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-3.5 py-3 text-sm text-green-700 mb-4">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>{status}</span>
                            </div>
                        )}

                        <form onSubmit={submit} className="space-y-4">
                            {(errors.email || errors.password) && (
                                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 text-sm text-red-700">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{errors.email || errors.password}</span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="username"
                                    autoFocus
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    className={`h-11 rounded-xl border-slate-200 focus:border-brand-primary focus:ring-brand-primary/20 ${errors.email ? 'border-red-400' : ''}`}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="password" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Palavra-passe
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className={`h-11 rounded-xl border-slate-200 focus:border-brand-primary focus:ring-brand-primary/20 ${errors.password ? 'border-red-400' : ''}`}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="remember"
                                        checked={data.remember}
                                        onChange={(e) => setData('remember', e.target.checked as false)}
                                        className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary/20"
                                    />
                                    <span className="text-xs text-slate-500">Lembrar-me</span>
                                </label>

                                {canResetPassword && (
                                    <Link
                                        href={route('password.request')}
                                        className="text-xs text-brand-primary font-semibold hover:underline"
                                    >
                                        Esqueceu a palavra-passe?
                                    </Link>
                                )}
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

                        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
                            <p>
                                Aluno?{' '}
                                <a href="/entrar" className="text-brand-primary font-semibold hover:underline">
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
