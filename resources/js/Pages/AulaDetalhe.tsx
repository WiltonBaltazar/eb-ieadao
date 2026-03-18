import { Head, Link } from '@inertiajs/react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Download,
  ExternalLink,
  FileText,
  Link2,
  QrCode,
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

const statusColors: Record<string, string> = {
  open:   'bg-green-100 text-green-800',
  closed: 'bg-slate-100 text-slate-600',
  draft:  'bg-yellow-100 text-yellow-800',
};

export default function AulaDetalhe({ studySession, resources, attended }: Props) {
  return (
    <StudentLayout>
      <Head title={studySession.title} />

      <div className="space-y-4">
        {/* Back + header */}
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-slate-500">
            <Link href="/meu-perfil">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar ao perfil
            </Link>
          </Button>

          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800">{studySession.title}</h1>
                <Badge className={statusColors[studySession.status] ?? ''}>
                  {studySession.status_label}
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                {studySession.classroom_name} · {studySession.session_date}
                {studySession.teacher_name && <> · {studySession.teacher_name}</>}
              </p>
              {studySession.lesson_type && (
                <p className="text-xs text-slate-400 mt-0.5">{studySession.lesson_type}</p>
              )}
            </div>

            {studySession.status === 'open' && (
              <Button asChild size="sm" variant="outline" className="gap-1.5 shrink-0">
                <a href={studySession.check_in_url} target="_blank" rel="noopener noreferrer">
                  <QrCode className="h-4 w-4" />
                  Fazer Check-in
                </a>
              </Button>
            )}
          </div>
        </div>

        {/* Attendance status */}
        {attended ? (
          <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span>Estiveste presente — {attended.method_label} às {attended.checked_in_at}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-500">
            <span className="h-4 w-4 rounded-full border-2 border-slate-300 shrink-0" />
            Não tens presença registada nesta aula.
          </div>
        )}

        {/* Notes */}
        {studySession.notes && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-slate-700">Notas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 whitespace-pre-line">{studySession.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Resources */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-500" />
              Recursos da Aula
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resources.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                Nenhum recurso disponível para esta aula.
              </p>
            ) : (
              <div className="space-y-1">
                {resources.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0"
                  >
                    {r.type === 'file'
                      ? <FileText className="h-5 w-5 text-red-400 shrink-0" />
                      : <Link2 className="h-5 w-5 text-blue-400 shrink-0" />
                    }
                    <span className="flex-1 text-sm text-slate-700 truncate">{r.title}</span>
                    <Button asChild size="sm" variant="outline" className="text-xs shrink-0 gap-1.5">
                      <a
                        href={r.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={r.type === 'file' ? (r.original_filename ?? true) : undefined}
                      >
                        {r.type === 'file'
                          ? <><Download className="h-3.5 w-3.5" />Baixar</>
                          : <><ExternalLink className="h-3.5 w-3.5" />Abrir</>
                        }
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
