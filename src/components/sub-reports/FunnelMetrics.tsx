"use client";

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

// Fixed equilateral-like triangle (300 × 260 ≈ 300 × √3/2)
const W = 300;
const H = 260;
const cx = W / 2;
const h1 = H / 3;        // 86.67 — first band separator
const h2 = (2 * H) / 3;  // 173.33 — second band separator

// Left/right edges of the triangle at a given y
const xl = (y: number) => (cx * y) / H;
const xr = (y: number) => W - (cx * y) / H;

const SECTIONS = [
  { label: "Impressões", fill: "#8B5CF6" },
  { label: "Cliques",    fill: "#F59E0B" },
  { label: "Conversões", fill: "#10B981" },
];

export default function FunnelMetrics({ totals }: { totals: Totals }) {
  const top = totals.impressions || 1;
  const values = [totals.impressions, totals.clicks, totals.conversions];

  return (
    <div className="flex flex-col h-full">
      <p className="text-sm font-semibold text-slate-700 mb-3">Funil de Performance</p>

      <div className="flex-1 flex items-center justify-center py-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[220px]">
          {/* Band 1 — Impressões */}
          <polygon
            points={`0,0 ${W},0 ${xr(h1)},${h1} ${xl(h1)},${h1}`}
            fill="#8B5CF6"
          />
          {/* Band 2 — Cliques */}
          <polygon
            points={`${xl(h1)},${h1} ${xr(h1)},${h1} ${xr(h2)},${h2} ${xl(h2)},${h2}`}
            fill="#F59E0B"
          />
          {/* Band 3 — Conversões */}
          <polygon
            points={`${xl(h2)},${h2} ${xr(h2)},${h2} ${cx},${H}`}
            fill="#10B981"
          />

          {/* White separators */}
          <line x1={xl(h1)} y1={h1} x2={xr(h1)} y2={h1} stroke="white" strokeWidth="2.5" />
          <line x1={xl(h2)} y1={h2} x2={xr(h2)} y2={h2} stroke="white" strokeWidth="2.5" />

          {/* Band 1 text — center of band */}
          <text x={cx} y={h1 / 2 - 6} textAnchor="middle"
            fill="white" fontSize="18" fontWeight="700" fontFamily="system-ui,sans-serif">
            {fmtNum(totals.impressions)}
          </text>
          <text x={cx} y={h1 / 2 + 11} textAnchor="middle"
            fill="rgba(255,255,255,0.85)" fontSize="11" fontFamily="system-ui,sans-serif">
            Impressões
          </text>

          {/* Band 2 text — center of band */}
          <text x={cx} y={(h1 + h2) / 2 - 6} textAnchor="middle"
            fill="white" fontSize="16" fontWeight="700" fontFamily="system-ui,sans-serif">
            {fmtNum(totals.clicks)}
          </text>
          <text x={cx} y={(h1 + h2) / 2 + 11} textAnchor="middle"
            fill="rgba(255,255,255,0.85)" fontSize="11" fontFamily="system-ui,sans-serif">
            Cliques
          </text>

          {/* Band 3 text — anchored near top of band where triangle is wider */}
          <text x={cx} y={h2 + 18} textAnchor="middle"
            fill="white" fontSize="14" fontWeight="700" fontFamily="system-ui,sans-serif">
            {fmtNum(totals.conversions)}
          </text>
          <text x={cx} y={h2 + 33} textAnchor="middle"
            fill="rgba(255,255,255,0.85)" fontSize="10" fontFamily="system-ui,sans-serif">
            Conversões
          </text>
        </svg>
      </div>

      {/* Legend with percentages */}
      <div className="space-y-1.5 mt-2">
        {SECTIONS.map((s, i) => (
          <div key={s.label} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.fill }} />
              <span className="text-slate-600">{s.label}</span>
            </span>
            <span className="font-semibold text-slate-800 tabular-nums">
              {fmtNum(values[i])}
              <span className="text-slate-400 font-normal ml-1">
                ({((values[i] / top) * 100).toFixed(1)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
