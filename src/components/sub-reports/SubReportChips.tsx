"use client";

import type { SubReport } from "./CreateSubReportModal";

interface Props {
  subReports: SubReport[];
  activeId: string | null;
  onSelect: (subReport: SubReport | null) => void;
  onEdit: (subReport: SubReport) => void;
}

export default function SubReportChips({ subReports, activeId, onSelect, onEdit }: Props) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Ver todas */}
      <button
        onClick={() => onSelect(null)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
          activeId === null
            ? "bg-slate-800 text-white border-slate-800"
            : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
        }`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        Ver todas
      </button>

      {subReports.map((sr) => (
        <div key={sr.id} className="flex items-center">
          <button
            onClick={() => onSelect(sr)}
            className={`flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-l-full text-xs font-medium border-y border-l transition ${
              activeId === sr.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
            }`}
          >
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="max-w-[120px] truncate">{sr.name}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(sr); }}
            className={`flex items-center justify-center w-7 h-7 rounded-r-full border-y border-r transition ${
              activeId === sr.id
                ? "bg-blue-700 text-white border-blue-600 hover:bg-blue-800"
                : "bg-white text-slate-400 border-slate-300 hover:text-blue-500 hover:border-blue-400"
            }`}
            title="Editar sub-relatório"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
