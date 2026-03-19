import React from 'react';

interface PublicLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function PublicLayout({ children, title }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Branded top panel */}
      <div className="bg-brand-primary px-6 pt-10 pb-16 text-center shrink-0">
        <div className="flex items-center justify-center gap-2.5 mb-1">
          <div className="h-9 w-9 rounded-xl bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/30">
            <span className="text-white font-black text-sm tracking-tight">IE</span>
          </div>
          <span className="text-white font-bold text-xl tracking-tight">IEADAO</span>
        </div>
        <p className="text-white/40 text-xs">Sistema de Presenças</p>
        {title && (
          <p className="text-white/70 text-sm mt-3 font-medium">{title}</p>
        )}
      </div>

      {/* Content card overlapping the header */}
      <main className="flex-1 flex flex-col items-center px-4 -mt-8">
        {children}
      </main>

      <footer className="py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} IEADAO
      </footer>
    </div>
  );
}
