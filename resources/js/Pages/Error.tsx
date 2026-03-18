import { Head, Link } from '@inertiajs/react';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { AlertTriangle, ArrowLeft, Home } from 'lucide-react';

interface ErrorPageProps {
  status: number;
  message: string;
}

const titles: Record<number, string> = {
  403: 'Acesso Negado',
  404: 'Página Não Encontrada',
  419: 'Sessão Expirada',
  429: 'Demasiados Pedidos',
  500: 'Erro do Servidor',
  503: 'Serviço Indisponível',
};

const descriptions: Record<number, string> = {
  403: 'Não tens permissão para aceder a esta página.',
  404: 'A página que procuras não existe ou foi movida.',
  419: 'A tua sessão expirou. Por favor, recarrega a página e tenta novamente.',
  429: 'Fizeste demasiados pedidos. Aguarda um momento e tenta novamente.',
  500: 'Ocorreu um erro inesperado. A equipa foi notificada.',
  503: 'O serviço está temporariamente indisponível. Tenta novamente em breve.',
};

export default function Error({ status, message }: ErrorPageProps) {
  const title = titles[status] ?? 'Erro';
  const description = message || descriptions[status] || 'Ocorreu um erro inesperado.';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Head title={`${title} — IEADAO Presenças`} />
      <Card className="max-w-md w-full">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div>
            <p className="text-5xl font-bold text-slate-300">{status}</p>
            <h1 className="text-xl font-semibold text-slate-800 mt-2">{title}</h1>
            <p className="text-sm text-slate-500 mt-2">{description}</p>
          </div>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" size="sm" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button asChild size="sm">
              <Link href="/">
                <Home className="h-4 w-4 mr-2" />
                Início
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
