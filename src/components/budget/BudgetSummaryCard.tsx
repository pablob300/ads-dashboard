"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { channelLabel } from "@/lib/budget";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface Props {
  name: string;
  channel: string;
  budget: number;
  spent: number;
}

export default function BudgetSummaryCard({ name, channel, budget, spent }: Props) {
  const plannedBarRef = useRef<HTMLDivElement>(null);
  const spentBarRef = useRef<HTMLDivElement>(null);
  const plannedTextRef = useRef<HTMLParagraphElement>(null);
  const spentTextRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const max = Math.max(budget, spent, 1);
    const plannedPct = (budget / max) * 100;
    const spentPct = (spent / max) * 100;

    const ctx = gsap.context(() => {
      if (plannedBarRef.current) {
        gsap.fromTo(
          plannedBarRef.current,
          { height: "0%" },
          { height: `${plannedPct}%`, duration: 1, ease: "power2.out" }
        );
      }
      if (spentBarRef.current) {
        gsap.fromTo(
          spentBarRef.current,
          { height: "0%" },
          { height: `${spentPct}%`, duration: 1, ease: "power2.out", delay: 0.1 }
        );
      }

      const counter = { budget: 0, spent: 0 };
      gsap.to(counter, {
        budget,
        spent,
        duration: 1,
        ease: "power2.out",
        onUpdate: () => {
          if (plannedTextRef.current) plannedTextRef.current.textContent = fmtBRL(counter.budget);
          if (spentTextRef.current) spentTextRef.current.textContent = fmtBRL(counter.spent);
        },
      });
    });

    return () => ctx.revert();
  }, [budget, spent]);

  const pct = budget > 0 ? Math.round((spent / budget) * 100) : null;
  const spentBarColor = pct !== null && pct > 100 ? "bg-red-500" : pct !== null && pct >= 90 ? "bg-amber-500" : "bg-blue-500";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="font-medium text-slate-800 truncate">{name}</p>
        <span className="text-xs text-slate-400 shrink-0 bg-slate-50 border border-slate-200 rounded-full px-2 py-0.5">
          {channelLabel(channel)}
        </span>
      </div>

      <div className="flex items-end gap-6 h-28 px-2">
        <div className="flex-1 flex flex-col items-center gap-1.5 h-full">
          <div className="w-full flex-1 flex items-end bg-slate-50 rounded-lg overflow-hidden">
            <div ref={plannedBarRef} className="w-full bg-slate-300 rounded-t-lg" style={{ height: "0%" }} />
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Planejado</span>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1.5 h-full">
          <div className="w-full flex-1 flex items-end bg-slate-50 rounded-lg overflow-hidden">
            <div ref={spentBarRef} className={`w-full rounded-t-lg ${spentBarColor}`} style={{ height: "0%" }} />
          </div>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Executado</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm gap-2">
        <p ref={plannedTextRef} className="font-semibold text-slate-700 tabular-nums">R$ 0,00</p>
        <p ref={spentTextRef} className="font-semibold text-blue-600 tabular-nums">R$ 0,00</p>
      </div>

      {pct !== null && (
        <p className="text-xs text-slate-400 mt-1 text-right">{pct}% do orçamento</p>
      )}
    </div>
  );
}
