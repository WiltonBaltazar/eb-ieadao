import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { UserPlus, AlertCircle } from 'lucide-react';

export default function Register() {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    const firstError = errors.name || errors.email || errors.password || errors.password_confirmation;

    return (
        <PublicLayout>
            <Head title="Criar Conta — IEADAO" />

            <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
                    <div className="h-1 bg-brand-accent" />

                    <div className="px-6 pt-6 pb-7">
                        <div className="flex justify-center mb-5">
                            <div className="h-14 w-14 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/30">
                                <UserPlus className="h-6 w-6 text-white" />
                            </div>
                        </div>

                        <h1 className="text-xl font-bold text-slate-800 text-center">Criar Conta</h1>
                        <p className="text-sm text-slate-400 text-center mt-1 mb-6">
                            Preenche os dados para criar a tua conta.
                        </p>

                        <form onSubmit={submit} className="space-y-4">
                            {firstError && (
                                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-3.5 py-3 text-sm text-red-700">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{firstError}</span>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label htmlFor="name" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Nome
                                </label>
                                <Input
                                    id="name"
                                    autoFocus
                                    autoComplete="name"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    required
                                    className={`h-11 rounded-xl border-slate-200 focus:border-brand-primary focus:ring-brand-primary/20 ${errors.name ? 'border-red-400' : ''}`}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="email" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    autoComplete="username"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    required
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
                                    autoComplete="new-password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    required
                                    className={`h-11 rounded-xl border-slate-200 focus:border-brand-primary focus:ring-brand-primary/20 ${errors.password ? 'border-red-400' : ''}`}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="password_confirmation" className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                    Confirmar Palavra-passe
                                </label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    autoComplete="new-password"
                                    value={data.password_confirmation}
                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                    required
                                    className={`h-11 rounded-xl border-slate-200 focus:border-brand-primary focus:ring-brand-primary/20 ${errors.password_confirmation ? 'border-red-400' : ''}`}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full h-11 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-sm shadow-lg shadow-brand-primary/25 transition-all"
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        A criar conta...
                                    </span>
                                ) : 'Criar Conta'}
                            </Button>
                        </form>

                        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
                            <p>
                                Já tens conta?{' '}
                                <Link href={route('login')} className="text-brand-primary font-semibold hover:underline">
                                    Entrar
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
