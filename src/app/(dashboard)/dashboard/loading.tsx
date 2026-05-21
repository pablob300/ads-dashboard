export default function DashboardLoading() {
  return (
    <div className="animate-pulse">
      {/* Saudação */}
      <div className="mb-6">
        <div className="h-8 w-48 bg-slate-200 rounded-lg mb-2" />
        <div className="h-4 w-56 bg-slate-100 rounded" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
            <div className="h-4 w-36 bg-slate-100 rounded" />
            <div className="h-9 w-16 bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
