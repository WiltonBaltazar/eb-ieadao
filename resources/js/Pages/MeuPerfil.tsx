import { Head, Link } from '@inertiajs/react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Progress } from '@/Components/ui/progress';
import { Calendar, CheckCircle2, ChevronRight, Edit2, ExternalLink, QrCode } from 'lucide-react';
import { MeuPerfilPageProps } from '@/types';
import FlashMessage from '@/Components/FlashMessage';

export default function MeuPerfil({ student, stats, lastAttendances, upcomingSessions }: MeuPerfilPageProps) {
  const methodBadge = (method: string) => (
    <Badge variant="outline" className={method === 'qr' ? 'border-purple-300 text-purple-700' : 'border-slate-300 text-slate-600'}>
      {method === 'qr' ? 'QR' : 'Manual'}
    </Badge>
  );

  return (
    <StudentLayout>
      <Head title="Meu Perfil — IEADAO Presenças" />
      <FlashMessage />

      <div className="space-y-4">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Olá, {student.name.split(' ')[0]}! 👋
          </h1>
          {student.classroom_name && (
            <p className="text-slate-500 text-sm mt-1">{student.classroom_name}</p>
          )}
        </div>

        {/* Stats Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              As Minhas Presenças
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-slate-800">{stats.attended}</span>
              <span className="text-slate-500">/ {stats.total} sessões</span>
              <Badge className="ml-auto bg-green-100 text-green-800 hover:bg-green-100">
                {stats.rate}%
              </Badge>
            </div>
            <Progress value={stats.rate} className="h-2" />
            <p className="text-xs text-slate-500">
              {stats.total === 0
                ? 'Ainda não há sessões registadas.'
                : `${stats.rate}% de taxa de presença`}
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Sessions */}
        {upcomingSessions.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-5 w-5 text-blue-500" />
                Sessões Abertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{session.title}</p>
                    <p className="text-xs text-slate-500">{session.session_date}</p>
                  </div>
                  <Button asChild size="sm" variant="outline" className="text-xs">
                    <a href={session.check_in_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Check-in
                    </a>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Recent Attendances */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-500" />
                Últimas Presenças
              </CardTitle>
              <Button asChild variant="ghost" size="sm" className="text-xs text-slate-500">
                <Link href="/minhas-presencas">
                  Ver todas <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {lastAttendances.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                Ainda não tens presenças registadas.
              </p>
            ) : (
              <div className="space-y-1">
                {lastAttendances.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800 truncate">{a.session_title}</p>
                      <p className="text-xs text-slate-500">{a.session_date}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {methodBadge(a.method)}
                      <span className="text-xs text-slate-400">{a.checked_in_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button asChild variant="outline" className="h-12">
            <Link href="/minhas-presencas">
              <Calendar className="mr-2 h-4 w-4" />
              Histórico
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12">
            <Link href="/perfil/editar">
              <Edit2 className="mr-2 h-4 w-4" />
              Editar Perfil
            </Link>
          </Button>
        </div>
      </div>
    </StudentLayout>
  );
}
