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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/Components/ui/sheet';

interface AdminLayoutProps {
  children: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/utilizadores', label: 'Utilizadores', icon: Users },
  { href: '/admin/alunos', label: 'Alunos', icon: GraduationCap },
  { href: '/admin/turmas', label: 'Turmas', icon: BookOpen },
  { href: '/admin/sessoes', label: 'Aulas', icon: CalendarDays },
  { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart2 },
  { href: '/admin/definicoes', label: 'Definições', icon: Settings },
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
        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium',
        isActive
          ? 'bg-brand-accent text-white shadow-md shadow-brand-accent/20'
          : 'text-white/70 hover:bg-white/10 hover:text-white',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? label : undefined}
    >
      <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-white" : "text-white/70")} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export default function AdminLayout({ children, breadcrumbs }: AdminLayoutProps) {
  const { auth } = usePage<PageProps>().props;
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    router.post('/logout');
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Sidebar — desktop */}
      <aside className={cn(
        'hidden md:flex flex-col bg-brand-primary transition-all duration-300 z-20 shadow-xl',
        collapsed ? 'w-20' : 'w-64'
      )}>
        <div className={cn(
          'h-16 flex items-center border-b border-white/10 px-4',
          collapsed ? 'justify-center' : 'justify-between'
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/20">
                <span className="text-white font-bold text-xs">IE</span>
              </div>
              <span className="text-white font-bold text-lg tracking-tight truncate">IEADAO</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-white/50 hover:text-white p-1.5 rounded-md hover:bg-white/10 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 flex flex-col gap-1.5">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} collapsed={collapsed} />
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:bg-white/10 hover:text-white transition-all w-full text-sm font-medium',
              collapsed && 'justify-center px-2'
            )}
            title={collapsed ? 'Sair' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0 text-white/70" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/60 flex items-center px-6 gap-4 sticky top-0 z-40 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]">
          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-brand-primary p-0 border-r-0">
              <div className="h-16 flex items-center px-6 border-b border-white/10 gap-3">
                <div className="h-8 w-8 rounded bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/20">
                  <span className="text-white font-bold text-xs">IE</span>
                </div>
                <span className="text-white font-bold tracking-tight">IEADAO</span>
              </div>
              <nav className="py-6 px-3 flex flex-col gap-1.5">
                {navItems.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1 text-sm text-slate-500 flex-1">
              {breadcrumbs.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span>/</span>}
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-slate-800">{crumb.label}</Link>
                  ) : (
                    <span className="text-slate-800 font-medium">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}

          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs bg-slate-200">
                      {auth.user?.name?.charAt(0)?.toUpperCase() ?? 'A'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-sm text-slate-700 max-w-[8rem] truncate">
                    {auth.user?.name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem disabled>
                  <span className="text-xs text-slate-500 capitalize">{auth.user?.role}</span>
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
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
