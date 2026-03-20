import { Head, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { CheckCircle2 } from 'lucide-react';
import { PageProps } from '@/types';

interface Props extends PageProps {
  settings: {
    qr_ttl_minutes: number;
    attendance_threshold: number;
    app_name: string;
  };
}

export default function Definicoes({ settings }: Props) {
  const { flash } = usePage<PageProps>().props;
  const { data, setData, put, processing } = useForm({
    qr_ttl_minutes: settings.qr_ttl_minutes,
    attendance_threshold: settings.attendance_threshold,
    app_name: settings.app_name,
  });

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    put('/admin/definicoes');
  };

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Definições' }]}>
      <Head title="Definições — IEADAO" />

      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Definições</h1>

        {flash?.success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>{flash.success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Aplicação</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="app_name">Nome da Aplicação</Label>
                <Input id="app_name" value={data.app_name} onChange={(e) => setData('app_name', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">QR Code</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="qr_ttl">Validade do Código QR (minutos)</Label>
                <Input
                  id="qr_ttl"
                  type="number"
                  min={1}
                  max={1440}
                  value={data.qr_ttl_minutes}
                  onChange={(e) => setData('qr_ttl_minutes', Number(e.target.value))}
                />
                <p className="text-xs text-slate-500">Tempo até o código expirar após ser gerado.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Relatórios</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="threshold">Limiar de Presenças (%)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min={1}
                  max={100}
                  value={data.attendance_threshold}
                  onChange={(e) => setData('attendance_threshold', Number(e.target.value))}
                />
                <p className="text-xs text-slate-500">Estudantes abaixo desta % aparecem no relatório de acompanhamento.</p>
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={processing}>
            {processing ? 'A guardar...' : 'Guardar Definições'}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}
