import React from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import { Home, BookOpen, CalendarCheck, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/meu-perfil', label: 'Início', icon: Home, exact: true },
  { href: '/minhas-aulas', label: 'Aulas', icon: BookOpen },
  { href: '/minhas-presencas', label: 'Presenças', icon: CalendarCheck },
  { href: '/perfil/editar', label: 'Perfil', icon: User },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const page = usePage<PageProps>();
  const { auth } = page.props;
  const user = auth.user;
  const current = page.url.split('?')[0];

  const isActive = (href: string, exact?: boolean) =>
    exact ? current === href : current.startsWith(href);

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? 'E';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-brand-primary sticky top-0 z-40 shadow-lg shadow-brand-primary/20">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-lg bg-brand-accent flex items-center justify-center shadow-md shadow-brand-accent/40">
              <span className="text-white font-black text-[10px] tracking-tight">IE</span>
            </div>
            <div className="leading-none">
              <span className="text-white font-bold text-sm block">IEADAO</span>
              <span className="text-white/40 text-[9px]">Presenças</span>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {navItems.map(({ href, label, icon: Icon, exact }) => {
              const active = isActive(href, exact);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                    active
                      ? 'bg-white/15 text-white'
                      : 'text-white/55 hover:text-white hover:bg-white/10'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Avatar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none rounded-full ring-2 ring-white/20 hover:ring-white/50 transition-all">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs bg-brand-accent text-white font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2 border-b border-slate-100 mb-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400">Estudante</p>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/perfil/editar">
                  <User className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.post('/sair')}
                className="text-red-600 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Page content — extra bottom padding on mobile for bottom nav */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5 pb-24 md:pb-8">
        {children}
      </main>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200/80 z-40"
        style={{ boxShadow: '0 -4px 24px rgba(0,0,0,0.07)' }}>
        <div className="grid grid-cols-4 h-16 max-w-2xl mx-auto">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className="relative flex flex-col items-center justify-center gap-0.5 transition-colors"
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-brand-primary rounded-full" />
                )}
                <Icon className={cn(
                  'h-5 w-5 transition-colors',
                  active ? 'text-brand-primary' : 'text-slate-400'
                )} />
                <span className={cn(
                  'text-[10px] font-medium transition-colors',
                  active ? 'text-brand-primary' : 'text-slate-400'
                )}>
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
