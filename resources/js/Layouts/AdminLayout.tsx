import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';
import { Button } from '@/Components/ui/button';
import { Avatar, AvatarFallback } from '@/Components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  User,
  BookOpen,
  CalendarDays,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/Components/ui/sheet';

interface AdminLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

const navGroups = [
  {
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
      { href: '/admin/utilizadores', label: 'Utilizadores', icon: Users },
      { href: '/admin/alunos', label: 'Alunos', icon: GraduationCap },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/admin/matriculas', label: 'Matrículas', icon: ClipboardList },
      { href: '/admin/turmas', label: 'Turmas', icon: BookOpen },
      { href: '/admin/sessoes', label: 'Aulas', icon: CalendarDays },
      { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart2 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/definicoes', label: 'Definições', icon: Settings },
    ],
  },
];

function NavLink({ href, label, icon: Icon, collapsed, exact }: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  collapsed?: boolean;
  exact?: boolean;
}) {
  const currentUrl = typeof window !== 'undefined' ? window.location.pathname : '';
  const isActive = exact ? currentUrl === href : currentUrl.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-2.5 rounded-md transition-all duration-150 text-sm',
        collapsed
          ? [
              'justify-center px-2 py-2',
              isActive
                ? 'bg-white/15 text-white'
                : 'text-white/55 hover:bg-white/8 hover:text-white/90',
            ]
          : [
              'px-3 py-2 border-l-[3px]',
              isActive
                ? 'bg-white/10 text-white font-medium border-l-brand-accent'
                : 'text-white/55 hover:bg-white/8 hover:text-white/90 border-l-transparent',
            ],
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-white/55')} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  return (
    <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5 overflow-y-auto">
      {navGroups.map((group, gi) => (
        <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
          {!collapsed && group.label && (
            <p className="px-3 mb-1.5 mt-0.5 text-[10px] font-bold uppercase tracking-widest text-white/25 select-none">
              {group.label}
            </p>
          )}
          {collapsed && gi > 0 && (
            <div className="my-2 border-t border-white/[0.08]" />
          )}
          <div className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} collapsed={collapsed} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout({ children, breadcrumbs }: AdminLayoutProps) {
  const { auth } = usePage<PageProps>().props;
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    router.post('/logout');
  };

  const initials = auth.user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() ?? 'A';

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar — desktop */}
      <aside className={cn(
        'hidden md:flex flex-col bg-brand-primary transition-all duration-300 z-20 shadow-xl',
        collapsed ? 'w-[4.5rem]' : 'w-64'
      )}>
        {/* Orange accent top strip */}
        <div className="h-[3px] bg-brand-accent w-full shrink-0" />

        {/* Logo */}
        <div className={cn(
          'h-16 flex items-center border-b border-white/[0.07] px-3 shrink-0',
          collapsed ? 'justify-center' : 'justify-between gap-2'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/30 shrink-0">
                <span className="text-white font-black text-xs tracking-tight">IE</span>
              </div>
              <div className="min-w-0">
                <span className="text-white font-bold text-sm tracking-tight block leading-tight truncate">IEADAO</span>
                <span className="text-white/35 text-[10px] leading-none">Painel Admin</span>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/35 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <SidebarNav collapsed={collapsed} />

        {/* Logout */}
        <div className="shrink-0 border-t border-white/[0.07] p-2">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-2.5 w-full py-2 text-white/45 hover:text-white/90 hover:bg-white/8 rounded-md transition-colors text-sm',
              collapsed ? 'justify-center px-2' : 'px-3'
            )}
            title={collapsed ? 'Sair' : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 md:px-6 gap-4 sticky top-0 z-40">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-brand-primary p-0 border-r-0">
              <div className="h-[3px] bg-brand-accent w-full" />
              <div className="h-16 flex items-center px-4 border-b border-white/[0.07] gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-brand-accent flex items-center justify-center shadow-lg">
                  <span className="text-white font-black text-xs">IE</span>
                </div>
                <div>
                  <span className="text-white font-bold text-sm block leading-tight">IEADAO</span>
                  <span className="text-white/35 text-[10px]">Painel Admin</span>
                </div>
              </div>
              <SidebarNav collapsed={false} />
            </SheetContent>
          </Sheet>

          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-sm flex-1 min-w-0">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                  {crumb.href ? (
                    <Link href={crumb.href} className="text-slate-400 hover:text-slate-700 transition-colors truncate">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-slate-800 font-semibold truncate">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          <div className="ml-auto shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-8 px-2 hover:bg-slate-100 rounded-lg">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-brand-primary text-white font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm text-slate-600 font-medium max-w-[8rem] truncate">
                    {auth.user?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled>
                  <span className="text-xs text-slate-400 capitalize">{auth.user?.role}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/admin/perfil">
                    <User className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
