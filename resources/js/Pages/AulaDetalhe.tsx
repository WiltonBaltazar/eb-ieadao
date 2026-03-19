import { Head, Link } from '@inertiajs/react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Button } from '@/Components/ui/button';
import {
  BookOpen, CheckCircle2, ChevronLeft,
  Download, ExternalLink, FileText, Link2, QrCode,
  Calendar, User, Tag,
} from 'lucide-react';
import { LessonResource, PageProps } from '@/types';

interface Props extends PageProps {
  studySession: {
    id: number;
    title: string;
    session_date: string;
    classroom_name: string;
    teacher_name: string | null;
    lesson_type: string | null;
    notes: string | null;
    status: string;
    status_label: string;
    check_in_url: string;
  };
  resources: LessonResource[];
  attended: { checked_in_at: string; method_label: string } | null;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  open:   { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  draft:  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
};

export default function AulaDetalhe({ studySession, resources, attended }: Props) {
  const sc = statusConfig[studySession.status] ?? statusConfig.closed;

  return (
    <StudentLayout>
      <Head title={studySession.title} />

      <div className="space-y-4">
        {/* Back */}
        <button
          onClick={() => history.back()}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-600 transition-colors -ml-0.5"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar
        </button>

        {/* Hero section */}
        <div className="bg-brand-primary rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="absolute -right-2 bottom-2 h-16 w-16 rounded-full bg-brand-accent/15" />

          <div className="relative">
            {/* Status */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${sc.bg} ${sc.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${sc.dot} ${studySession.status === 'open' ? 'animate-pulse' : ''}`} />
                {studySession.status_label}
              </span>
              {studySession.status === 'open' && (
                <a
                  href={studySession.check_in_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 bg-brand-accent text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-brand-accent/90 transition-colors shrink-0"
                >
                  <QrCode className="h-3.5 w-3.5" />
                  Check-in
                </a>
              )}
            </div>

            <h1 className="text-lg font-bold leading-snug">{studySession.title}</h1>

            {/* Meta row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
              <span className="flex items-center gap-1.5 text-white/60 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                {studySession.session_date}
              </span>
              {studySession.teacher_name && (
                <span className="flex items-center gap-1.5 text-white/60 text-xs">
                  <User className="h-3.5 w-3.5" />
                  {studySession.teacher_name}
                </span>
              )}
              {studySession.lesson_type && (
                <span className="flex items-center gap-1.5 text-white/60 text-xs">
                  <Tag className="h-3.5 w-3.5" />
                  {studySession.lesson_type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Attendance status */}
        {attended ? (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-4 py-3.5">
            <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-800">Presença confirmada</p>
              <p className="text-xs text-green-600 mt-0.5">{attended.method_label} · {attended.checked_in_at}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5">
            <div className="h-9 w-9 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
            </div>
            <p className="text-sm text-slate-500">Sem presença registada nesta aula.</p>
          </div>
        )}

        {/* Notes */}
        {studySession.notes && (
          <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
            <div className="px-5 pt-4 pb-1 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Notas</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{studySession.notes}</p>
            </div>
          </div>
        )}

        {/* Resources */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-primary" />
            <p className="text-sm font-semibold text-slate-700">
              Recursos da Aula
              {resources.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">{resources.length} {resources.length === 1 ? 'item' : 'itens'}</span>
              )}
            </p>
          </div>
          <div className="divide-y divide-slate-50">
            {resources.length === 0 ? (
              <div className="py-10 text-center">
                <FileText className="h-10 w-10 mx-auto mb-2.5 text-slate-200" />
                <p className="text-sm text-slate-400">Nenhum recurso disponível.</p>
              </div>
            ) : (
              resources.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${r.type === 'file' ? 'bg-red-100' : 'bg-blue-100'}`}>
                    {r.type === 'file'
                      ? <FileText className="h-4 w-4 text-red-500" />
                      : <Link2 className="h-4 w-4 text-blue-500" />
                    }
                  </div>
                  <span className="flex-1 text-sm text-slate-700 truncate">{r.title}</span>
                  <a
                    href={r.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={r.type === 'file' ? (r.original_filename ?? true) : undefined}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary border border-brand-primary/20 bg-brand-primary/5 hover:bg-brand-primary/10 px-3 py-1.5 rounded-lg transition-colors shrink-0"
                  >
                    {r.type === 'file'
                      ? <><Download className="h-3.5 w-3.5" />Baixar</>
                      : <><ExternalLink className="h-3.5 w-3.5" />Abrir</>
                    }
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}
