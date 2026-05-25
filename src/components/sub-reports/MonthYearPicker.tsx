"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  selected: string[]; // formato "YYYY-MM"
  onChange: (selected: string[], range: { start: string; end: string } | null) => void;
}

function getLastMonths(count: number): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
      .replace(".", "")
      .replace(" de ", " ");
    months.push({ key, label });
  }
  return months;
}

function computeRange(selected: string[]): { start: string; end: string } | null {
  if (selected.length === 0) return null;
  const sorted = [...selected].sort();
  const startMonth = sorted[0];
  const endMonth = sorted[sorted.length - 1];
  const [sy, sm] = startMonth.split("-").map(Number);
  const [ey, em] = endMonth.split("-").map(Number);
  const lastDay = new Date(ey, em, 0).getDate();
  return {
    start: `${sy}-${String(sm).padStart(2, "0")}-01`,
    end: `${ey}-${String(em).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
  };
}

function buttonLabel(selected: string[], months: { key: string; label: string }[]): string {
  if (selected.length === 0) return "Selecionar período";
  if (selected.length === 1) {
    return months.find((m) => m.key === selected[0])?.label ?? selected[0];
  }
  const sorted = [...selected].sort();
  const first = months.find((m) => m.key === sorted[0])?.label ?? sorted[0];
  const last  = months.find((m) => m.key === sorted[sorted.length - 1])?.label ?? sorted[sorted.length - 1];
  return `${first} – ${last}`;
}

export default function MonthYearPicker({ selected, onChange }: Props) {
  const months = getLastMonths(24);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(key: string) {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];
    onChange(next, computeRange(next));
  }

  function clear() {
    onChange([], null);
    setOpen(false);
  }

  const hasSelection = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`h-9 flex items-center gap-2 pl-3 pr-3 border rounded-lg text-sm bg-white hover:border-slate-400 transition min-w-[200px] ${
          hasSelection ? "border-blue-400 text-blue-700" : "border-slate-300 text-[#333333]"
        }`}
      >
        <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="flex-1 text-left truncate">
          {buttonLabel(selected, months)}
        </span>
        {hasSelection ? (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="w-4 h-4 flex items-center justify-center rounded-full bg-blue-100 text-blue-500 hover:bg-blue-200 transition shrink-0 text-[10px] font-bold"
          >
            ✕
          </span>
        ) : (
          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute top-10 left-0 z-50 w-64 bg-white border border-slate-200 rounded-xl shadow-xl">
          <div className="p-2 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-500 px-2 py-1">Selecione um ou mais meses</p>
          </div>
          <div className="max-h-56 overflow-y-auto p-2 space-y-0.5">
            {months.map(({ key, label }) => {
              const active = selected.includes(key);
              return (
                <button
                  key={key}
                  onClick={() => toggle(key)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition text-left"
                >
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${active ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                    {active && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-xs text-slate-700">{label}</span>
                </button>
              );
            })}
          </div>
          <div className="p-2 border-t border-slate-100 flex gap-2">
            {hasSelection && (
              <button
                onClick={clear}
                className="flex-1 text-center text-xs text-slate-500 hover:text-slate-700 py-2 border border-slate-200 rounded-lg transition"
              >
                Limpar
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="flex-1 text-center text-xs text-blue-600 hover:text-blue-700 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition font-medium"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
