import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Button } from '@/Components/ui/button';
import { RefreshCw, QrCode as QrIcon, Clock } from 'lucide-react';
import { PageProps } from '@/types';

interface Props extends PageProps {
  studySession: {
    id: number;
    title: string;
    session_date: string;
    status: string;
    classroom_name: string;
    check_in_code: string | null;
    check_in_code_expires_at: string | null;
  };
  qrSvg: string | null;
  checkInUrl: string;
  canManage: boolean;
}

export default function SessaoQr({ studySession, qrSvg, checkInUrl, canManage }: Props) {
  const [timeLeft, setTimeLeft] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!studySession.check_in_code_expires_at) return;

    const update = () => {
      const diff = new Date(studySession.check_in_code_expires_at!).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
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
  }, [studySession.check_in_code_expires_at]);

  const handleRegenerate = () => {
    router.post(`/admin/sessoes/${studySession.id}/regenerar-codigo`, {}, {
      onSuccess: () => router.reload(),
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
      <Head title={`QR — ${studySession.title}`} />

      <div className="text-center space-y-6 max-w-sm w-full">
        <div>
          <h1 className="text-xl font-bold">{studySession.title}</h1>
          <p className="text-slate-400 text-sm mt-1">{studySession.classroom_name} · {studySession.session_date}</p>
        </div>

        {qrSvg ? (
          <div className="bg-white rounded-2xl p-4 inline-block shadow-2xl">
            <img
              src={`data:image/svg+xml;base64,${qrSvg}`}
              alt="QR Code"
              className="w-64 h-64"
            />
          </div>
        ) : (
          <div className="bg-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center">
            <QrIcon className="h-24 w-24 text-slate-600" />
            <p className="text-slate-400 mt-3 text-sm">Sessão não está aberta</p>
          </div>
        )}

        {studySession.check_in_code && (
          <div className="space-y-2">
            <p className="text-slate-400 text-xs uppercase tracking-wider">Código de Acesso</p>
            <p className="text-3xl font-mono font-bold tracking-widest">{studySession.check_in_code}</p>
          </div>
        )}

        {timeLeft && (
          <div className={`flex items-center justify-center gap-2 text-sm ${expired ? 'text-red-400' : 'text-slate-300'}`}>
            <Clock className="h-4 w-4" />
            <span>{expired ? 'Código expirado' : `Expira em ${timeLeft}`}</span>
          </div>
        )}

        {canManage && (
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleRegenerate}
              variant="outline"
              className="bg-transparent border-slate-600 text-white hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Gerar Novo Código
            </Button>
            <Button
              asChild
              variant="ghost"
              className="text-slate-400 hover:text-black"
            >
              <a href="/admin/sessoes">← Voltar</a>
            </Button>
          </div>
        )}

        <p className="text-xs text-slate-600 break-all">{checkInUrl}</p>
      </div>
    </div>
  );
}
