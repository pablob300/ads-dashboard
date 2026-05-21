"use client";

import { signOut } from "next-auth/react";

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  onMenuClick?: () => void;
}

export default function Header({ user, onMenuClick }: HeaderProps) {
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Hambúrguer (mobile) */}
      <button
        onClick={onMenuClick}
        className="lg:hidden text-slate-500 hover:text-slate-700 transition p-1 -ml-1"
        aria-label="Abrir menu"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Espaçador desktop */}
      <div className="hidden lg:block" />

      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-slate-600">{user.name}</span>
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {initials}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-slate-400 hover:text-slate-600 transition"
          title="Sair"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
}
