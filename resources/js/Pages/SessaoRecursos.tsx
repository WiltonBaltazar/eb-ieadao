import { Head, Link } from '@inertiajs/react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { BookOpen, ChevronLeft, Download, ExternalLink, FileText, Link2 } from 'lucide-react';
import { LessonResource, PageProps } from '@/types';

interface Props extends PageProps {
  studySession: {
    id: number;
    title: string;
    session_date: string;
    classroom_name: string;
  };
  resources: LessonResource[];
}

export default function SessaoRecursos({ studySession, resources }: Props) {
  return (
    <StudentLayout>
      <Head title={`Recursos — ${studySession.title}`} />

      <div className="space-y-4">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-slate-500">
            <Link href="/meu-perfil">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Voltar ao perfil
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-slate-800">{studySession.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {studySession.classroom_name} · {studySession.session_date}
          </p>
        </div>

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
                      <a href={r.download_url} target="_blank" rel="noopener noreferrer" download={r.type === 'file'}>
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
