"use client";

import { useEffect, useRef, useState } from "react";
import type { SubReport } from "./CreateSubReportModal";

interface Props {
  subReports: SubReport[];
  activeId: string | null;
  onSelect: (subReport: SubReport | null) => void;
  onEdit: (subReport: SubReport) => void;
  readOnly?: boolean;
}

export default function SubReportChips({ subReports, activeId, onSelect, onEdit, readOnly }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeReport = subReports.find((sr) => sr.id === activeId) ?? null;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (subReports.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`h-9 flex items-center gap-2 pl-3 pr-2.5 border rounded-lg text-sm bg-white hover:border-slate-400 transition min-w-[160px] ${
          activeId !== null
            ? "border-blue-400 text-blue-700 bg-blue-50"
            : "border-slate-300 text-[#333333]"
        }`}
      >
        <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span className="flex-1 text-left truncate max-w-[130px]">
          {activeReport ? activeReport.name : "Sub-relatórios"}
        </span>
        {activeId === null && (
          <span className="text-xs bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5 font-medium shrink-0">
            {subReports.length}
          </span>
        )}
        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition text-left hover:bg-slate-50 ${
              activeId === null ? "text-slate-800 font-medium" : "text-slate-600"
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="flex-1">Ver todas</span>
            {activeId === null && (
              <svg className="w-3.5 h-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>

          <div className="border-t border-slate-100 my-1" />

          {subReports.map((sr) => (
            <div key={sr.id} className="flex items-center">
              <button
                onClick={() => { onSelect(sr); setOpen(false); }}
                className={`flex-1 flex items-center gap-2.5 px-3 py-2 text-sm transition text-left hover:bg-slate-50 min-w-0 ${
                  activeId === sr.id ? "text-blue-700 font-medium" : "text-slate-600"
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="truncate flex-1">{sr.name}</span>
                {activeId === sr.id && (
                  <svg className="w-3.5 h-3.5 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              {!readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(sr); setOpen(false); }}
                  className="p-2 mr-1 text-slate-400 hover:text-blue-500 transition rounded-lg hover:bg-blue-50 shrink-0"
                  title="Editar"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
