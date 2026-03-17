import { Head } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Users, BookOpen, CalendarDays, Activity } from 'lucide-react';
import { PageProps } from '@/types';
import FlashMessage from '@/Components/FlashMessage';

interface DashboardProps extends PageProps {
  stats: {
    total_students: number;
    total_classrooms: number;
    total_sessions: number;
    open_sessions: number;
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
  lowAttendance: Array<{
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

const statusColors: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-600',
  draft: 'bg-yellow-100 text-yellow-800',
};

export default function Dashboard({ stats, recentSessions, lowAttendance, threshold }: DashboardProps) {
  return (
    <AdminLayout breadcrumbs={[{ label: 'Dashboard' }]}>
      <Head title="Dashboard — IEADAO" />
      <FlashMessage />

      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <p className="text-sm text-slate-500">Turmas</p>
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
                  <p className="text-sm text-slate-500">Abertas</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{stats.open_sessions}</p>
                </div>
                <Activity className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
        </div>

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

          {/* Low Attendance */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-amber-700">
                Presenças Abaixo de {threshold}%
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0">
              {lowAttendance.length === 0 ? (
                <p className="px-6 py-4 text-sm text-slate-500">Todos acima do limiar. 🎉</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {lowAttendance.map((s) => (
                    <div key={s.id} className="px-6 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.classroom_name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="text-sm font-semibold text-amber-600">{s.rate}%</span>
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
