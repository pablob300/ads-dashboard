"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const integrationPaths = ["/integrations", "/onboarding"];
  const isIntegrationActive = integrationPaths.some((p) => pathname.startsWith(p));
  const [integracoesOpen, setIntegracoesOpen] = useState(isIntegrationActive);

  return (
    <aside className="w-60 h-full bg-slate-900 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm">B300 Dashboard</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-white transition"
            aria-label="Fechar menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {/* Dashboard */}
        <NavItem href="/dashboard" label="Dashboard" onClose={onClose} active={pathname === "/dashboard"}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </NavItem>

        {/* Clientes */}
        <NavItem
          href="/clients"
          label="Clientes"
          onClose={onClose}
          active={pathname === "/clients" || (pathname.startsWith("/clients") && !pathname.includes("/dashboard"))}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </NavItem>

        {/* Integrações (collapsible) */}
        <div>
          <button
            onClick={() => setIntegracoesOpen((o) => !o)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
              isIntegrationActive
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <span className="flex-1 text-left">Integrações</span>
            <svg
              className={cn("w-3.5 h-3.5 transition-transform shrink-0", integracoesOpen ? "rotate-180" : "")}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {integracoesOpen && (
            <div className="mt-1 ml-4 space-y-0.5 border-l border-slate-700 pl-3">
              {/* Google Ads */}
              <Link
                href="/integrations/google"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
                  pathname.startsWith("/integrations/google") || pathname.startsWith("/onboarding")
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <svg viewBox="0 0 48 48" className="w-4 h-4 shrink-0">
                  <path fill="#4285F4" d="M43.6 20.5H24v7h11.3c-1.6 5.1-6.4 8.5-11.3 8.5-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.3-5.3C33.6 6.5 29 4.5 24 4.5 13.3 4.5 4.5 13.3 4.5 24S13.3 43.5 24 43.5c10.8 0 20-8 20-19.5 0-1.2-.1-2-.4-3.5z"/>
                </svg>
                Google Ads
              </Link>

              {/* Meta Ads */}
              <Link
                href="/integrations/meta"
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition",
                  pathname.startsWith("/integrations/meta")
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Meta Ads
              </Link>
            </div>
          )}
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-slate-800">
        <p className="text-slate-600 text-xs px-3">v1.0.0</p>
      </div>
    </aside>
  );
}

function NavItem({
  href, label, active, onClose, children,
}: {
  href: string; label: string; active: boolean;
  onClose?: () => void; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition",
        active ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
      )}
    >
      {children}
      {label}
    </Link>
  );
}
