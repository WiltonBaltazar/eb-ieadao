import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent } from '@/Components/ui/card';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  Search,
  CalendarDays,
  ChevronRight,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { PageProps } from '@/types';

interface Session {
  id: number;
  title: string;
  session_date: string;
  status: string;
  status_label: string;
  classroom_name: string;
  lesson_type: string | null;
  resources_count: number;
  attended: boolean;
  session_url: string;
}

interface Props extends PageProps {
  sessions: Session[];
  filters: Record<string, string>;
}

export default function TodasAulas({ sessions, filters }: Props) {
  const [search, setSearch] = useState(filters.search ?? '');

  const handleSearch = () => {
    router.get('/minhas-aulas', { search }, { preserveState: true });
  };

  const statusColors: Record<string, string> = {
    open:   'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-600',
  };

  return (
    <StudentLayout>
      <Head title="Todas as Aulas — IEADAO" />

      <div className="space-y-5">
        {/* Header */}
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2 text-slate-500">
            <Link href="/meu-perfil">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Voltar
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-slate-800">Todas as Aulas</h1>
          <p className="text-sm text-slate-500 mt-1">
            Consulta os recursos de todas as aulas ministradas.
          </p>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Pesquisar aula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-9"
          />
          <Button size="sm" variant="outline" onClick={handleSearch} className="h-9 px-3 shrink-0">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Sessions list */}
        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 text-slate-200" />
              <p className="font-medium text-slate-500">Nenhuma aula encontrada</p>
              <p className="text-sm text-slate-400 mt-1">
                {search ? 'Tenta outro termo de pesquisa.' : 'Ainda não há aulas registadas.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {sessions.map((s) => (
              <Link key={s.id} href={s.session_url} className="block group">
                <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md border-slate-200/60 overflow-hidden">
                  <CardContent className="p-4 flex items-center gap-4">
                    {/* Attendance indicator */}
                    <div className="shrink-0">
                      {s.attended ? (
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <XCircle className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-primary transition-colors truncate">
                          {s.title}
                        </p>
                        <Badge className={`${statusColors[s.status] ?? 'bg-slate-100 text-slate-600'} text-xs shrink-0`}>
                          {s.status_label}
                        </Badge>
                        {!s.attended && (
                          <Badge variant="outline" className="text-xs text-slate-400 shrink-0">
                            Não esteve presente
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {s.session_date}
                        </span>
                        {s.lesson_type && (
                          <span className="text-xs text-slate-400">{s.lesson_type}</span>
                        )}
                        {s.resources_count > 0 && (
                          <span className="text-xs text-brand-primary flex items-center gap-1 font-medium">
                            <BookOpen className="h-3 w-3" />
                            {s.resources_count} {s.resources_count === 1 ? 'recurso' : 'recursos'}
                          </span>
                        )}
                        {s.resources_count === 0 && (
                          <span className="text-xs text-slate-300 flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            Sem recursos
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand-accent transition-colors shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
