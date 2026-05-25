"use client";

import { ResponsiveContainer, FunnelChart, Funnel, Tooltip, LabelList } from "recharts";

interface Totals {
  impressions: number;
  clicks: number;
  conversions: number;
}

function fmtNum(v: number) {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "k";
  return v.toLocaleString("pt-BR");
}

export default function FunnelMetrics({ totals }: { totals: Totals }) {
  const data = [
    { name: "Impressões", value: totals.impressions, fill: "#8B5CF6" },
    { name: "Cliques",    value: totals.clicks,      fill: "#F59E0B" },
    { name: "Conversões", value: totals.conversions, fill: "#10B981" },
  ];

  const top = totals.impressions || 1;

  return (
    <div className="flex flex-col h-full">
      <p className="text-sm font-semibold text-slate-700 mb-3">Funil de Performance</p>
      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart>
            <Tooltip
              formatter={(value, name) => {
                const v = Number(value ?? 0);
                return [`${fmtNum(v)} (${((v / top) * 100).toFixed(1)}%)`, String(name)];
              }}
            />
            <Funnel dataKey="value" data={data} isAnimationActive lastShapeType="rectangle">
              <LabelList
                position="center"
                dataKey="name"
                style={{ fill: "#fff", fontSize: 11, fontWeight: 600 }}
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      </div>
      {/* Legenda com valores */}
      <div className="space-y-1.5 mt-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.fill }} />
              <span className="text-slate-600">{item.name}</span>
            </span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {fmtNum(item.value)}
              <span className="text-slate-400 font-normal ml-1">
                ({((item.value / top) * 100).toFixed(1)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
