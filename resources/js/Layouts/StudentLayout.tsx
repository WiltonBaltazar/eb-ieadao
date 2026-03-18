import React from 'react';
import { Link, usePage } from '@inertiajs/react';
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
import { Home, BookOpen, User, LogOut, Menu, GraduationCap } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/Components/ui/sheet';

interface StudentLayoutProps {
  children: React.ReactNode;
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  const { auth } = usePage<PageProps>().props;
  const user = auth.user;

  const navLinks = [
    { href: '/meu-perfil', label: 'Início', icon: Home },
    { href: '/minhas-aulas', label: 'Aulas', icon: GraduationCap },
    { href: '/minhas-presencas', label: 'Presenças', icon: BookOpen },
    { href: '/perfil/editar', label: 'Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <div className="mt-6 flex flex-col gap-2">
                  {navLinks.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  ))}
                  <div className="border-t border-slate-200 my-2" />
                  <Link
                    href="/sair"
                    method="post"
                    as="button"
                    className="flex items-center gap-3 px-3 py-2 rounded-md text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <LogOut className="h-5 w-5" />
                    Sair
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-slate-800 text-sm">IEADAO Presenças</span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs bg-slate-200">
                    {user?.name?.charAt(0)?.toUpperCase() ?? 'E'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm text-slate-700 max-w-[6rem] truncate">
                  {user?.name}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem asChild>
                <Link href="/perfil/editar">
                  <User className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/sair" method="post" as="button" className="w-full text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
