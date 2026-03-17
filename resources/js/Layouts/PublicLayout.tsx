import React from 'react';

interface PublicLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function PublicLayout({ children, title }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      <header className="py-4 px-6 flex justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800">IEADAO Presenças</h1>
          {title && <p className="text-sm text-slate-500 mt-1">{title}</p>}
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">
        {children}
      </main>
      <footer className="py-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} IEADAO
      </footer>
    </div>
  );
}
