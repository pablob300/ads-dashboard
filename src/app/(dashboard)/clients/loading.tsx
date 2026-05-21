export default function ClientsLoading() {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-28 bg-slate-200 rounded-lg mb-2" />
          <div className="h-4 w-40 bg-slate-100 rounded" />
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-lg" />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-5 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-48 bg-slate-100 rounded" />
              </div>
              <div className="h-6 w-16 bg-slate-100 rounded-full" />
            </div>
            <div className="space-y-2">
              {[1, 2].map((j) => (
                <div key={j} className="h-4 w-full bg-slate-100 rounded" />
              ))}
            </div>
            <div className="pt-2 border-t border-slate-100 flex gap-2">
              <div className="flex-1 h-8 bg-slate-200 rounded-lg" />
              <div className="w-16 h-8 bg-slate-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
