import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import PublicLayout from '@/Layouts/PublicLayout';
import { Button } from '@/Components/ui/button';
import { MailCheck, CheckCircle2 } from 'lucide-react';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <PublicLayout>
            <Head title="Verificar Email — IEADAO" />

            <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
                    <div className="h-1 bg-brand-accent" />

                    <div className="px-6 pt-6 pb-7">
                        <div className="flex justify-center mb-5">
                            <div className="h-14 w-14 rounded-2xl bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/30">
                                <MailCheck className="h-6 w-6 text-white" />
                            </div>
                        </div>

                        <h1 className="text-xl font-bold text-slate-800 text-center">Verifica o teu Email</h1>
                        <p className="text-sm text-slate-400 text-center mt-1 mb-6">
                            Enviámos um link de verificação para o teu endereço de email. Clica no link para ativar a tua conta.
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-3.5 py-3 text-sm text-green-700 mb-4">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>Novo link de verificação enviado para o teu email.</span>
                            </div>
                        )}

                        <form onSubmit={submit}>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full h-11 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white font-semibold text-sm shadow-lg shadow-brand-primary/25 transition-all"
                            >
                                {processing ? (
                                    <span className="flex items-center gap-2">
                                        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                        A enviar...
                                    </span>
                                ) : 'Reenviar Email de Verificação'}
                            </Button>
                        </form>

                        <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-400">
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="text-slate-500 hover:text-slate-700 hover:underline"
                            >
                                Terminar Sessão
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
