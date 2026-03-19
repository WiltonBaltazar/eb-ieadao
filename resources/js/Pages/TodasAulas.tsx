import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import StudentLayout from '@/Layouts/StudentLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import {
  BookOpen, CheckCircle2, XCircle, Search,
  CalendarDays, ChevronRight, ChevronLeft, FileText,
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

interface PaginatorLink {
  url: string | null;
  label: string;
  active: boolean;
}

interface Paginator {
  data: Session[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
  links: PaginatorLink[];
}

interface Props extends PageProps {
  sessions: Paginator;
  filters: Record<string, string>;
}

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  open:   { label: 'Aberta', dot: 'bg-green-500', text: 'text-green-700' },
  closed: { label: 'Encerrada', dot: 'bg-slate-300', text: 'text-slate-500' },
  draft:  { label: 'Rascunho', dot: 'bg-amber-400', text: 'text-amber-600' },
};

export default function TodasAulas({ sessions, filters }: Props) {
  const [search, setSearch] = useState(filters.search ?? '');

  const handleSearch = () => {
    router.get('/minhas-aulas', { search }, { preserveState: true });
  };

  const goToPage = (url: string | null) => {
    if (!url) return;
    const sep = url.includes('?') ? '&' : '?';
    const fullUrl = search ? `${url}${sep}search=${encodeURIComponent(search)}` : url;
    router.visit(fullUrl, { preserveState: true });
  };

  const { data: sessionList, current_page, last_page, total, from, to, links } = sessions;
  const hasPrev = current_page > 1;
  const hasNext = current_page < last_page;

  const pageLinks = links.filter(
    (l) => l.label !== '&laquo; Previous' && l.label !== 'Next &raquo;'
  );

  return (
    <StudentLayout>
      <Head title="Todas as Aulas — IEADAO" />

      <div className="space-y-5">
        {/* Page header */}
        <div className="pt-1">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Turma</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-0.5">Todas as Aulas</h1>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <Input
            placeholder="Pesquisar aula..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="h-10 rounded-xl border-slate-200 focus:border-brand-primary"
          />
          <Button size="sm" variant="outline" onClick={handleSearch} className="h-10 w-10 rounded-xl shrink-0 p-0">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Sessions list */}
        {sessionList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 py-16 text-center shadow-sm">
            <CalendarDays className="h-12 w-12 mx-auto mb-3 text-slate-200" />
            <p className="font-semibold text-slate-500">Nenhuma aula encontrada</p>
            <p className="text-sm text-slate-400 mt-1">
              {search ? 'Tenta outro termo de pesquisa.' : 'Ainda não há aulas registadas.'}
            </p>
          </div>
        ) : (
          <>
            {/* Count */}
            <p className="text-xs text-slate-400">
              {from}–{to} de {total} aula{total !== 1 ? 's' : ''}
            </p>

            <div className="space-y-2.5">
              {sessionList.map((s) => {
                const sc = statusConfig[s.status] ?? statusConfig.closed;
                return (
                  <Link key={s.id} href={s.session_url} className="block group">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-slate-200 transition-all duration-200 overflow-hidden">
                      {/* Attended indicator strip */}
                      <div className={`h-0.5 ${s.attended ? 'bg-green-400' : 'bg-slate-100'}`} />

                      <div className="px-4 py-3.5 flex items-center gap-4">
                        {/* Attendance icon */}
                        <div className="shrink-0">
                          {s.attended ? (
                            <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                          ) : (
                            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                              <XCircle className="h-5 w-5 text-slate-300" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-primary transition-colors truncate">
                              {s.title}
                            </p>
                            {s.status === 'open' && (
                              <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full shrink-0">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                Aberta
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <CalendarDays className="h-3 w-3" />
                              {s.session_date}
                            </span>
                            {s.lesson_type && (
                              <span className="text-xs text-slate-400">{s.lesson_type}</span>
                            )}
                            {s.resources_count > 0 ? (
                              <span className="text-xs text-brand-primary flex items-center gap-1 font-semibold">
                                <BookOpen className="h-3 w-3" />
                                {s.resources_count} {s.resources_count === 1 ? 'recurso' : 'recursos'}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                Sem recursos
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-brand-accent transition-colors shrink-0" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Pagination */}
            {last_page > 1 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasPrev}
                  onClick={() => goToPage(links[0]?.url)}
                  className="gap-1 h-9 px-4 text-xs rounded-xl"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Anterior
                </Button>

                <div className="flex items-center gap-1">
                  {pageLinks.map((link, i) => {
                    const isEllipsis = link.label === '...';
                    if (isEllipsis) {
                      return <span key={i} className="px-1 text-xs text-slate-400">…</span>;
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => goToPage(link.url)}
                        disabled={link.active || !link.url}
                        className={[
                          'h-8 min-w-[32px] rounded-lg px-2 text-xs font-medium transition-colors',
                          link.active
                            ? 'bg-brand-primary text-white shadow-sm cursor-default'
                            : 'text-slate-600 hover:bg-slate-100 disabled:opacity-40',
                        ].join(' ')}
                      >
                        {link.label}
                      </button>
                    );
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={!hasNext}
                  onClick={() => goToPage(links[links.length - 1]?.url)}
                  className="gap-1 h-9 px-4 text-xs rounded-xl"
                >
                  Próxima
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
}
