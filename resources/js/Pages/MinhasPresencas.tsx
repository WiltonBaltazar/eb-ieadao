import { Head, Link } from '@inertiajs/react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { CalendarCheck, ChevronLeft, ChevronRight, TrendingUp, Zap } from 'lucide-react';
import { MinhasPresencasPageProps } from '@/types';

export default function MinhasPresencas({ attendances, stats }: MinhasPresencasPageProps) {
  const methodBadge = (method: string) => (
    <Badge variant="outline" className={method === 'qr' ? 'border-purple-300 text-purple-700 text-xs' : 'border-slate-300 text-slate-600 text-xs'}>
      {method === 'qr' ? 'QR' : 'Manual'}
    </Badge>
  );

  return (
    <StudentLayout>
      <Head title="Minhas Presenças — IEADAO Presenças" />

      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Minhas Presenças</h1>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.attended}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <CalendarCheck className="h-3 w-3" />
                Total
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.rate}%</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Taxa
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <div className="text-2xl font-bold text-slate-800">{stats.streak}</div>
              <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Sequência
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Histórico Completo</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {attendances.data.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <CalendarCheck className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                <p className="font-medium">Ainda não tens presenças</p>
                <p className="text-sm mt-1">As tuas presenças aparecerão aqui.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {attendances.data.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-6 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{a.session_title}</p>
                      <p className="text-xs text-slate-500">{a.session_date} · {a.classroom_name}</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {methodBadge(a.method)}
                      <span className="text-xs text-slate-400">{a.checked_in_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {attendances.last_page > 1 && (
          <div className="flex items-center justify-between text-sm">
            <p className="text-slate-500">
              {attendances.from}–{attendances.to} de {attendances.total}
            </p>
            <div className="flex gap-2">
              {attendances.links.map((link, i) => (
                link.url ? (
                  <Link key={i} href={link.url}>
                    <Button variant={link.active ? 'default' : 'outline'} size="sm" className="h-8 px-3">
                      {link.label === '&laquo; Previous' ? <ChevronLeft className="h-4 w-4" /> :
                       link.label === 'Next &raquo;' ? <ChevronRight className="h-4 w-4" /> :
                       link.label}
                    </Button>
                  </Link>
                ) : null
              ))}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
