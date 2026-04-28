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
import { Download, AlertTriangle } from 'lucide-react';
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
  na_igreja: number;
  online: number;
}

interface Props extends PageProps {
  belowThreshold: Array<{
    id: number;
    name: string;
    phone: string;
    classroom_name: string;
    attended: number;
    missed: number;
    total: number;
    rate: number;
  }>;
  threshold: number;
  classrooms: ClassroomOption[];
  availableYears: number[];
}

function defaultRange(): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  return { from, to };
}

/** Download an xlsx file via fetch+blob so the page never navigates. */
async function dlXlsx(url: string): Promise<void> {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename[^;=\n]*=(["']?)([^"'\n;]+)\1/);
  const filename = match?.[2] ?? 'export.xlsx';

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
}

export default function Relatorios({ belowThreshold, threshold, classrooms, availableYears }: Props) {
  const defaults = defaultRange();
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [classroomId, setClassroomId] = useState('all');
  const [exportYear, setExportYear] = useState<string>(
    availableYears.length > 0 ? String(availableYears[0]) : 'all'
  );
  const [mapaClassroom, setMapaClassroom] = useState<string>(
    classrooms.length > 0 ? String(classrooms[0].id) : ''
  );
  const [downloading, setDownloading] = useState(false);

  const handleDownload = (url: string) => {
    if (downloading) return;
    setDownloading(true);
    dlXlsx(url).finally(() => setDownloading(false));
  };
  const [mapaYear, setMapaYear] = useState<string>(
    availableYears.length > 0 ? String(availableYears[0]) : String(new Date().getFullYear())
  );
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

      const merged = current
        .map((point, i) => {
          const prev = previous[i];
          const row: Record<string, unknown> = {
            label: point.label,
            date: point.date,
          };
          if (prev) {
            row['Período anterior'] = prev.count;
            row['prevLabel'] = prev.label;
          }
          row['Na Igreja'] = point.na_igreja;
          row['Online'] = point.online;
          return row;
        })
        .filter((row) =>
          (Number(row['Na Igreja'] ?? 0) + Number(row['Online'] ?? 0)) > 0 ||
          Number(row['Período anterior'] ?? 0) > 0
        );

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

        <Tabs defaultValue="presencas">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="presencas">Presenças</TabsTrigger>
            <TabsTrigger value="registos">Registos</TabsTrigger>
            <TabsTrigger value="acompanhamento">Acompanhamento</TabsTrigger>
          </TabsList>

          {/* Presenças */}
          <TabsContent value="presencas" className="space-y-4">
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
                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreset('this-month')}>Este mês</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreset('last-month')}>Mês passado</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreset('last-3-months')}>Últimos 3 meses</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const params = new URLSearchParams({ from, to });
                        if (classroomId !== 'all') params.set('classroom_id', classroomId);
                        handleDownload(`/admin/relatorios/periodo/exportar-excel?${params}`);
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Por Sessão
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => {
                        const params = new URLSearchParams({ from, to });
                        if (classroomId !== 'all') params.set('classroom_id', classroomId);
                        handleDownload(`/admin/relatorios/periodo/exportar-excel-alunos?${params}`);
                      }}
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Por Aluno
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ficha ICI */}
            <Card className="border-blue-200/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Presenças Formato ICI</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-1">
                    <Label className="text-xs">Turma</Label>
                    <Select value={mapaClassroom} onValueChange={setMapaClassroom}>
                      <SelectTrigger className="h-8 w-52"><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
                      <SelectContent>
                        {classrooms.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}{!c.is_active ? ' (inativa)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ano</Label>
                    <Select value={mapaYear} onValueChange={setMapaYear}>
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {availableYears.map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-blue-700 border-blue-300 hover:bg-blue-50 gap-1.5"
                    disabled={!mapaClassroom}
                    onClick={() => handleDownload(`/admin/relatorios/turma/${mapaClassroom}/exportar-mapa?year=${mapaYear}`)}
                  >
                    <Download className="h-4 w-4" />
                    Exportar Presenças no Formato ICI
                  </Button>
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  Gera a ficha MAPA GERAL de presenças no formato ICI — P (presença) / F (falta) por aula de terça-feira.
                </p>
              </CardContent>
            </Card>

            <Card className="transition-all duration-300 hover:shadow-md border-slate-200/60 relative group">
              <div className="absolute inset-0 bg-gradient-to-t from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl" />
              <CardHeader className="relative">
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
                          const church = Number(p['Na Igreja'] ?? 0);
                          const online = Number(p['Online'] ?? 0);
                          const parts = [`${p.label}  —  Total: ${church + online}`];
                          if (p.prevLabel) parts.push(`Anterior: ${p.prevLabel}`);
                          return parts.join(' | ');
                        }}
                      />
                      <Legend />
                      {hasPrevious && (
                        <Bar dataKey="Período anterior" fill="#F9AF0B" radius={[4, 4, 0, 0]} />
                      )}
                      <Bar dataKey="Na Igreja" fill="#1A1D6B" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Online" fill="#6366F1" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registos */}
          <TabsContent value="registos">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <CardTitle className="text-base">Registos de Presença</CardTitle>
                <div className="flex items-center gap-2 shrink-0">
                  <Select value={exportYear} onValueChange={setExportYear}>
                    <SelectTrigger className="h-8 w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os anos</SelectItem>
                      {availableYears.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(
                      exportYear === 'all'
                        ? '/admin/relatorios/exportar'
                        : `/admin/relatorios/exportar?year=${exportYear}`
                    )}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">
                  {exportYear === 'all'
                    ? 'Exporta todos os registos de presença para Excel.'
                    : `Exporta os registos de presença de ${exportYear} para Excel.`}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Acompanhamento */}
          <TabsContent value="acompanhamento" className="space-y-3">
            <Card className="transition-all duration-300 hover:shadow-md border-slate-200/60">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-brand-accent">
                  <AlertTriangle className="h-5 w-5" />
                  Estudantes Abaixo de {threshold}%
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                {belowThreshold.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-slate-500">Todos os estudantes estão acima do limiar!</p>
                ) : (
                  <div className="divide-y divide-slate-100/60">
                    {belowThreshold.map((s) => (
                      <div key={s.id} className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50/80 transition-colors group">
                        <div className="flex-1">
                          <p className="font-medium text-sm text-slate-800">{s.name}</p>
                          <p className="text-xs text-slate-500">{s.classroom_name} · {s.phone}</p>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-brand-accent/10 text-brand-accent border-0 font-semibold">{s.rate}%</Badge>
                          <p className="text-xs text-slate-400 mt-1">{s.attended}P · {s.missed}F · {s.total} sessões</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
