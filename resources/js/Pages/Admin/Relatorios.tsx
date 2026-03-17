import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, AlertTriangle } from 'lucide-react';
import { PageProps } from '@/types';

interface Props extends PageProps {
  attendanceOverTime: Array<{ date: string; count: number; title: string }>;
  byClassroom: Array<{
    id: number;
    name: string;
    students_count: number;
    sessions_count: number;
    total_attendances: number;
  }>;
  belowThreshold: Array<{
    id: number;
    name: string;
    phone: string;
    classroom_name: string;
    attended: number;
    total: number;
    rate: number;
  }>;
  threshold: number;
}

export default function Relatorios({ attendanceOverTime, byClassroom, belowThreshold, threshold }: Props) {
  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard', href: '/admin' }, { label: 'Relatórios' }]}>
      <Head title="Relatórios — IEADAO" />

      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>

        <Tabs defaultValue="visao-geral">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="visao-geral">Visão Geral</TabsTrigger>
            <TabsTrigger value="registos">Registos</TabsTrigger>
            <TabsTrigger value="acompanhamento">Acompanhamento</TabsTrigger>
            <TabsTrigger value="por-turma">Por Turma</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="visao-geral" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Presenças por Sessão (últimas 12)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={attendanceOverTime}>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value) => [value, 'Presenças']}
                      labelFormatter={(label) => `Sessão: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registos */}
          <TabsContent value="registos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Registos de Presença</CardTitle>
                <Button asChild size="sm" variant="outline">
                  <a href="/admin/relatorios/exportar" download>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar CSV
                  </a>
                </Button>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">Use o botão acima para exportar todos os registos em CSV.</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acompanhamento */}
          <TabsContent value="acompanhamento" className="space-y-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                  Estudantes Abaixo de {threshold}%
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {belowThreshold.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-slate-500">Todos os estudantes estão acima do limiar! 🎉</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {belowThreshold.map((s) => (
                      <div key={s.id} className="px-6 py-3 flex items-center gap-3">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.classroom_name} · {s.phone}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-amber-100 text-amber-800">{s.rate}%</Badge>
                          <p className="text-xs text-slate-400 mt-1">{s.attended}/{s.total} sessões</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Por Turma */}
          <TabsContent value="por-turma">
            <div className="grid gap-3 md:grid-cols-2">
              {byClassroom.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Estudantes</span>
                      <span className="font-medium">{c.students_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Sessões</span>
                      <span className="font-medium">{c.sessions_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Total Presenças</span>
                      <span className="font-medium">{c.total_attendances}</span>
                    </div>
                    {c.sessions_count > 0 && c.students_count > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Taxa Média</span>
                        <span className="font-medium text-green-600">
                          {Math.round((c.total_attendances / (c.sessions_count * c.students_count)) * 100)}%
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
