import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Progress } from '@/Components/ui/progress';
import { Users, BookOpen, CalendarDays, Activity, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PageProps } from '@/types';
import FlashMessage from '@/Components/FlashMessage';
import KpiCard from '@/Components/KpiCard';
import PageHeader from '@/Components/PageHeader';
import { statusColors } from '@/lib/constants';

interface DashboardProps extends PageProps {
  stats: {
    total_students: number;
    total_classrooms: number;
    total_sessions: number;
    open_sessions: number;
    avg_attendance: number;
    this_month_attendances: number;
    month_trend: number;
  };
  recentSessions: Array<{
    id: number;
    title: string;
    session_date: string;
    status: string;
    status_label: string;
    classroom_name: string;
    attendance_count: number;
  }>;
  topAttendance: Array<{
    id: number;
    name: string;
    phone: string;
    classroom_name: string;
    attended: number;
    total: number;
    rate: number;
  }>;
  threshold: number;
  grupoDistribution: Array<{
    value: string;
    label: string;
    count: number;
  }>;
  classroomRates: Array<{
    name: string;
    rate: number;
    students_count: number;
  }>;
}

const PIE_COLORS = ['#1A1D6B', '#FF6700', '#F9AF0B', '#10b981', '#8b5cf6', '#06b6d4'];

export default function Dashboard({
  stats,
  recentSessions,
  topAttendance,
  threshold,
  grupoDistribution,
  classroomRates,
}: DashboardProps) {
  const totalInPie = grupoDistribution.reduce((sum, g) => sum + g.count, 0);

  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <Head title="Dashboard — IEADAO" />
      <FlashMessage />

      <div className="space-y-6">
        <PageHeader title="Dashboard" subtitle="Visão geral da atividade do sistema" />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <KpiCard label="Estudantes"   value={stats.total_students}   icon={Users}       color="brand-primary" />
          <KpiCard label="Turmas Ativas" value={stats.total_classrooms} icon={BookOpen}    color="brand-accent" />
          <KpiCard label="Sessões"      value={stats.total_sessions}   icon={CalendarDays} color="brand-yellow" iconColor="text-slate-800" />
          <KpiCard label="Abertas Agora" value={stats.open_sessions}   icon={Activity}    color="green-500" valueColor="text-green-600" />
          <KpiCard label="Assiduidade"  value={`${stats.avg_attendance}%`} icon={Percent} color="slate-500" />
        </div>

        {/* Month trend card */}
        <Card className="transition-all duration-300 hover:shadow-md border-slate-200/60 overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="pt-6 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-brand-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-7 w-7 text-brand-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Presenças Este Mês</p>
                  <p className="text-4xl font-bold mt-1 tracking-tight text-slate-800">{stats.this_month_attendances}</p>
                </div>
              </div>
              <div className="text-right">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${stats.month_trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {stats.month_trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {stats.month_trend >= 0 ? '+' : ''}{stats.month_trend}%
                </div>
                <p className="text-xs font-medium text-slate-400 mt-2 tracking-wide uppercase">vs. mês anterior</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Row: Pie chart + Classroom rates */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Grupo Homogéneo Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Estudantes por Grupo Homogéneo</CardTitle>
            </CardHeader>
            <CardContent>
              {grupoDistribution.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">Sem dados.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={grupoDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      label={(props) => {
                        const entry = props.payload as { label: string; count: number };
                        return `${entry.label.replace('Grupo Homogéneo de ', '')} (${entry.count})`;
                      }}
                    >
                      {grupoDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => {
                        const v = Number(value);
                        return [`${v} (${totalInPie > 0 ? Math.round((v / totalInPie) * 100) : 0}%)`, String(name)];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Classroom attendance rates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Assiduidade por Turma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {classroomRates.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">Sem turmas ativas.</p>
              ) : (
                classroomRates.map((c) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{c.name}</span>
                      <span className="text-slate-500">{c.rate}% · {c.students_count} alunos</span>
                    </div>
                    <Progress value={c.rate} className="h-2" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row: Recent sessions + Top attendance */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Recent Sessions */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Aulas Recentes</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {recentSessions.length === 0 ? (
                <p className="px-6 py-4 text-sm text-slate-500">Nenhuma aula encontrada.</p>
              ) : (
                <div className="divide-y divide-slate-100/60">
                  {recentSessions.map((s) => (
                    <div key={s.id} className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.title}</p>
                        <p className="text-xs text-slate-500">{s.session_date} · {s.classroom_name}</p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-xs text-slate-500">{s.attendance_count} pres.</span>
                        <Badge className={statusColors[s.status] ?? ''}>{s.status_label}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Attendance */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base text-brand-primary">
                Alunos mais assíduos (acima de {threshold}%)
              </CardTitle>
              <Link
                href="/admin/ranking"
                className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
              >
                Ver todos
              </Link>
            </CardHeader>
            <CardContent className="px-0">
              {topAttendance.length === 0 ? (
                <p className="px-6 py-4 text-sm text-slate-500">Nenhum estudante acima do limiar.</p>
              ) : (
                <div className="divide-y divide-slate-100/60">
                  {topAttendance.map((s, i) => (
                    <div key={s.id} className="px-6 py-4 flex items-center gap-3 hover:bg-slate-50/80 transition-colors group">
                      <span className="text-xs font-mono text-slate-400 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.classroom_name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-semibold text-green-600">{s.rate}%</span>
                        <p className="text-xs text-slate-400">{s.attended}/{s.total}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
