import { Head } from '@inertiajs/react';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/Components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Download, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { PageProps } from '@/types';

interface ClassroomOption {
  id: number;
  name: string;
  is_active: boolean;
}

interface ChartPoint {
  date: string;
  label: string;
  count: number;
}

interface Props extends PageProps {
  byClassroom: Array<{
    id: number;
    name: string;
    is_active: boolean;
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
  classrooms: ClassroomOption[];
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return { from, to };
}

export default function Relatorios({ byClassroom, belowThreshold, threshold, classrooms }: Props) {
  const defaults = defaultRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [classroomId, setClassroomId] = useState('all');
  const [compare, setCompare] = useState(false);
  const [chartData, setChartData] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);

  const fetchChart = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to, compare: compare ? '1' : '0' });
      if (classroomId !== 'all') params.set('classroom_id', classroomId);

      const res = await fetch(`/admin/relatorios/chart-data?${params}`);
      const json = await res.json();

      const current: ChartPoint[] = json.current;
      const previous: ChartPoint[] = json.previous ?? [];
      setHasPrevious(previous.length > 0);

      // Merge current & previous into unified chart data
      const merged = current.map((point, i) => {
        const row: Record<string, unknown> = {
          label: point.label,
          date: point.date,
          Presenças: point.count,
        };
        if (previous[i]) {
          row['Período anterior'] = previous[i].count;
          row['prevLabel'] = previous[i].label;
        }
        return row;
      });

      setChartData(merged);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [from, to, classroomId, compare]);

  useEffect(() => {
    fetchChart();
  }, [fetchChart]);

  const setPreset = (preset: 'this-month' | 'last-month' | 'last-3-months') => {
    const now = new Date();
    let f: Date, t: Date;
    if (preset === 'this-month') {
      f = new Date(now.getFullYear(), now.getMonth(), 1);
      t = now;
    } else if (preset === 'last-month') {
      f = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      t = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      f = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      t = now;
    }
    setFrom(f.toISOString().slice(0, 10));
    setTo(t.toISOString().slice(0, 10));
  };

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
            {/* Filters */}
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">De</Label>
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 w-36" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Até</Label>
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 w-36" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Turma</Label>
                    <Select value={classroomId} onValueChange={setClassroomId}>
                      <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as turmas</SelectItem>
                        {classrooms.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}{!c.is_active ? ' (inativa)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 pb-0.5">
                    <Switch checked={compare} onCheckedChange={setCompare} id="compare" />
                    <Label htmlFor="compare" className="text-xs cursor-pointer">Comparar com período anterior</Label>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreset('this-month')}>Este mês</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreset('last-month')}>Mês passado</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreset('last-3-months')}>Últimos 3 meses</Button>
                </div>
              </CardContent>
            </Card>

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Presenças por Dia
                  {classroomId !== 'all' && (
                    <span className="text-slate-400 font-normal ml-2">
                      — {classrooms.find((c) => String(c.id) === classroomId)?.name}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center h-[250px] text-sm text-slate-400">A carregar...</div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-[250px] text-sm text-slate-400">Sem dados para o período selecionado</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chartData} barGap={2}>
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        interval={chartData.length > 31 ? Math.floor(chartData.length / 15) : 0}
                      />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(_label, payload) => {
                          if (!payload?.[0]) return '';
                          const p = payload[0].payload;
                          const parts = [`Data: ${p.label}`];
                          if (p.prevLabel) parts.push(`Anterior: ${p.prevLabel}`);
                          return parts.join(' | ');
                        }}
                      />
                      {hasPrevious && <Legend />}
                      <Bar dataKey="Presenças" fill="#6366f1" radius={[3, 3, 0, 0]} />
                      {hasPrevious && (
                        <Bar dataKey="Período anterior" fill="#c7d2fe" radius={[3, 3, 0, 0]} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
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
                  <p className="px-6 py-4 text-sm text-slate-500">Todos os estudantes estão acima do limiar!</p>
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
                  <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      {c.name}
                      {!c.is_active && <Badge variant="outline" className="text-slate-400 text-xs">Inativa</Badge>}
                    </CardTitle>
                    <Button asChild size="sm" variant="outline" className="h-7 px-2 gap-1 text-xs text-green-700 border-green-300 hover:bg-green-50 shrink-0">
                      <a href={`/admin/relatorios/turma/${c.id}/exportar-excel`} download={`assiduidade_${c.name}.xlsx`}>
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Excel
                      </a>
                    </Button>
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
