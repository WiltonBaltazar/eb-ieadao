import { Head, Link } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Progress } from '@/Components/ui/progress';
import { Users, BookOpen, CalendarDays, Activity, TrendingUp, TrendingDown, Percent } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PageProps } from '@/types';
import FlashMessage from '@/Components/FlashMessage';

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

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-600',
  draft: 'bg-yellow-100 text-yellow-800',
};

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];

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
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Estudantes</p>
                  <p className="text-2xl font-bold mt-1">{stats.total_students}</p>
                </div>
                <Users className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Turmas Ativas</p>
                  <p className="text-2xl font-bold mt-1">{stats.total_classrooms}</p>
                </div>
                <BookOpen className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Sessões</p>
                  <p className="text-2xl font-bold mt-1">{stats.total_sessions}</p>
                </div>
                <CalendarDays className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Abertas Agora</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{stats.open_sessions}</p>
                </div>
                <Activity className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Assiduidade Média</p>
                  <p className="text-2xl font-bold mt-1">{stats.avg_attendance}%</p>
                </div>
                <Percent className="h-8 w-8 text-slate-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Month trend card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Presenças Este Mês</p>
                <p className="text-3xl font-bold mt-1">{stats.this_month_attendances}</p>
              </div>
              <div className="text-right">
                <div className={`flex items-center gap-1 text-sm font-medium ${stats.month_trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {stats.month_trend >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  {stats.month_trend >= 0 ? '+' : ''}{stats.month_trend}%
                </div>
                <p className="text-xs text-slate-400 mt-0.5">vs. mês anterior</p>
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
              <CardTitle className="text-base">Sessões Recentes</CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {recentSessions.length === 0 ? (
                <p className="px-6 py-4 text-sm text-slate-500">Nenhuma sessão encontrada.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentSessions.map((s) => (
                    <div key={s.id} className="px-6 py-3 flex items-center gap-3">
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
              <CardTitle className="text-base text-green-700">
                Melhores Presenças (acima de {threshold}%)
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
                <div className="divide-y divide-slate-100">
                  {topAttendance.map((s, i) => (
                    <div key={s.id} className="px-6 py-3 flex items-center gap-3">
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
