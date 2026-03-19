import { Head, Link } from '@inertiajs/react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import {
  Calendar, CheckCircle2, ChevronRight, ExternalLink,
  GraduationCap, QrCode, Zap,
} from 'lucide-react';
import { MeuPerfilPageProps } from '@/types';
import FlashMessage from '@/Components/FlashMessage';

function AttendanceRing({ rate }: { rate: number }) {
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ - (rate / 100) * circ;
  const color = rate >= 75 ? '#22c55e' : rate >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <svg className="w-[88px] h-[88px] -rotate-90" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
      <circle
        cx="22" cy="22" r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

const methodLabel: Record<string, string> = {
  qr: 'QR Code',
  auto: 'Automático',
  manual: 'Manual',
};

const methodColors: Record<string, string> = {
  qr: 'bg-purple-100 text-purple-700',
  auto: 'bg-green-100 text-green-700',
  manual: 'bg-slate-100 text-slate-600',
};

export default function MeuPerfil({ student, stats, lastAttendances, upcomingSessions }: MeuPerfilPageProps) {
  const firstName = student.name.split(' ')[0];
  const rateEmoji = stats.rate >= 75 ? '🎯' : stats.rate >= 50 ? '📈' : '⚠️';
  const rateMsg = stats.rate >= 75 ? 'Excelente!' : stats.rate >= 50 ? 'A melhorar' : 'Em risco';

  return (
    <StudentLayout>
      <Head title="Início — IEADAO" />
      <FlashMessage />

      <div className="space-y-4">
        {/* Greeting */}
        <div className="pt-1">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Bem-vindo de volta</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">
            {firstName} 👋
          </h1>
          {student.classroom_name && (
            <p className="text-slate-400 text-sm mt-0.5">{student.classroom_name}</p>
          )}
        </div>

        {/* Attendance hero card */}
        <div className="rounded-2xl bg-brand-primary p-5 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/5" />
          <div className="absolute -right-3 bottom-3 h-20 w-20 rounded-full bg-brand-accent/15" />

          <p className="text-white/50 text-[10px] font-semibold uppercase tracking-widest mb-3 relative">
            As Minhas Presenças
          </p>

          <div className="flex items-center gap-5 relative">
            {/* Ring */}
            <div className="relative shrink-0">
              <AttendanceRing rate={stats.rate} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-base font-bold tabular-nums">{stats.rate}%</span>
              </div>
            </div>

            {/* Stats */}
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold tabular-nums">{stats.attended}</span>
                <span className="text-white/50 text-sm">/ {stats.total}</span>
              </div>
              <p className="text-white/50 text-xs mt-0.5">aulas frequentadas</p>
              {stats.total > 0 && (
                <p className="text-white/70 text-xs mt-2 font-medium">
                  {rateEmoji} {rateMsg}
                </p>
              )}
              {stats.total === 0 && (
                <p className="text-white/50 text-xs mt-2">Ainda sem sessões</p>
              )}
            </div>
          </div>
        </div>

        {/* Open sessions banner */}
        {upcomingSessions.length > 0 && (
          <div className="rounded-xl border-2 border-brand-accent/30 bg-brand-accent/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-accent" />
              </span>
              <p className="text-sm font-semibold text-brand-accent flex items-center gap-1.5">
                <QrCode className="h-3.5 w-3.5" />
                {upcomingSessions.length === 1 ? 'Aula aberta agora' : `${upcomingSessions.length} aulas abertas`}
              </p>
            </div>
            <div className="space-y-2">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="bg-white rounded-lg p-3 flex items-center justify-between gap-3 shadow-sm">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{session.title}</p>
                    <p className="text-xs text-slate-400">{session.session_date}</p>
                  </div>
                  <a
                    href={session.check_in_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1.5 bg-brand-accent text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-accent/90 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Check-in
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent attendances */}
        <Card>
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              Últimas Presenças
            </p>
            <Link
              href="/minhas-presencas"
              className="text-xs text-brand-primary font-medium hover:underline flex items-center gap-0.5"
            >
              Ver todas <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <CardContent className="px-4 pb-4">
            {lastAttendances.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-slate-200" />
                <p className="text-sm text-slate-400">Ainda não tens presenças registadas.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {lastAttendances.map((a, i) => (
                  <div
                    key={a.id}
                    className={`flex items-center justify-between py-2.5 ${i < lastAttendances.length - 1 ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{a.session_title}</p>
                        <p className="text-xs text-slate-400">{a.session_date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${methodColors[a.method] ?? 'bg-slate-100 text-slate-500'}`}>
                        {methodLabel[a.method] ?? a.method}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/minhas-aulas"
            className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-brand-primary hover:text-brand-primary transition-all"
          >
            <GraduationCap className="h-4 w-4" />
            Todas as Aulas
          </Link>
          <Link
            href="/minhas-presencas"
            className="flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-brand-primary hover:text-brand-primary transition-all"
          >
            <Zap className="h-4 w-4" />
            Histórico
          </Link>
        </div>
      </div>
    </StudentLayout>
  );
}
