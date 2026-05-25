"use client";

interface Props {
  selected: string[]; // formato "YYYY-MM"
  onChange: (selected: string[], range: { start: string; end: string } | null) => void;
}

function getLastMonths(count: number): { key: string; label: string }[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7); // "YYYY-MM"
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

export default function MonthYearPicker({ selected, onChange }: Props) {
  const months = getLastMonths(24);

  function toggle(key: string) {
    const next = selected.includes(key)
      ? selected.filter((k) => k !== key)
      : [...selected, key];
    onChange(next, computeRange(next));
  }

  function clear() {
    onChange([], null);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 shrink-0 font-medium">Período:</span>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 flex-1 min-w-0">
        {months.map(({ key, label }) => {
          const active = selected.includes(key);
          return (
            <button
              key={key}
              onClick={() => toggle(key)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-medium border transition whitespace-nowrap ${
                active
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <button
          onClick={clear}
          className="shrink-0 text-xs text-slate-400 hover:text-slate-600 transition px-1"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
