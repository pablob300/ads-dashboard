"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import type { CampaignData, CampaignMetric } from "@/lib/google-ads-campaigns";
import type { MetaCampaignData, MetaCampaignMetric } from "@/lib/meta-ads-campaigns";
import MonthYearPicker from "@/components/sub-reports/MonthYearPicker";
import SubReportChips from "@/components/sub-reports/SubReportChips";
import FunnelMetrics from "@/components/sub-reports/FunnelMetrics";
import type { SubReport } from "@/components/sub-reports/CreateSubReportModal";

interface Client {
  id: string;
  name: string;
  googleAdAccounts: { id: string; customerId: string; descriptiveName: string; alias: string | null }[];
  metaAdAccounts: { id: string; accountId: string; name: string; alias: string | null }[];
}

type Tab = "google" | "meta";

// ── helpers ──────────────────────────────────────────────────────────────────
function toInputDate(d: Date) { return d.toISOString().slice(0, 10); }
function defaultRange() {
  const today = new Date();
  return { start: toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)), end: toInputDate(today) };
}
function fmtBRL(v: number) { return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function fmtNum(v: number) { return v.toLocaleString("pt-BR"); }
function fmtPct(v: number) { return v.toFixed(2) + "%"; }
function fmtDate(d: string) { return d.split("-")[2]; }

export default function SharedDashboard({ client, token }: { client: Client; token: string }) {
  const [activeTab, setActiveTab] = useState<Tab>(
    client.googleAdAccounts.length > 0 ? "google" : "meta"
  );
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
          <p className="text-xs text-slate-400">
            {client.googleAdAccounts.length > 0 && `${client.googleAdAccounts.length} conta${client.googleAdAccounts.length !== 1 ? "s" : ""} Google`}
            {client.googleAdAccounts.length > 0 && client.metaAdAccounts.length > 0 && " · "}
            {client.metaAdAccounts.length > 0 && `${client.metaAdAccounts.length} conta${client.metaAdAccounts.length !== 1 ? "s" : ""} Meta`}
          </p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 border-b border-slate-200">
        {client.googleAdAccounts.length > 0 && (
          <button onClick={() => setActiveTab("google")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${activeTab === "google" ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <svg viewBox="0 0 48 48" className="w-4 h-4 shrink-0"><path fill="#4285F4" d="M43.6 20.5H24v7h11.3c-1.6 5.1-6.4 8.5-11.3 8.5-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.3-5.3C33.6 6.5 29 4.5 24 4.5 13.3 4.5 4.5 13.3 4.5 24S13.3 43.5 24 43.5c10.8 0 20-8 20-19.5 0-1.2-.1-2-.4-3.5z"/></svg>
            Google Ads
          </button>
        )}
        {client.metaAdAccounts.length > 0 && (
          <button onClick={() => setActiveTab("meta")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${activeTab === "meta" ? "border-[#1877F2] text-[#1877F2]" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill={activeTab === "meta" ? "#1877F2" : "#94a3b8"}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Meta Ads
          </button>
        )}
      </div>

      {activeTab === "google" && <GoogleTab client={client} token={token} />}
      {activeTab === "meta" && <MetaTab client={client} token={token} />}
    </div>
  );
}

// ── Google Tab ────────────────────────────────────────────────────────────────
type GoogleMetricKey = "costBRL" | "conversions" | "impressions" | "clicks";
const GOOGLE_METRICS: { key: GoogleMetricKey; label: string; color: string; yAxisId: string }[] = [
  { key: "costBRL",     label: "Valor Gasto",  color: "#3B82F6", yAxisId: "money"  },
  { key: "conversions", label: "Conversões",   color: "#10B981", yAxisId: "small"  },
  { key: "clicks",      label: "Cliques",      color: "#F59E0B", yAxisId: "volume" },
  { key: "impressions", label: "Impressões",   color: "#8B5CF6", yAxisId: "volume" },
];

function GoogleTab({ client, token }: { client: Client; token: string }) {
  const init = useMemo(() => defaultRange(), []);
  const [startDate, setStartDate] = useState(init.start);
  const [endDate, setEndDate] = useState(init.end);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [data, setData] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<GoogleMetricKey>>(new Set(["costBRL", "conversions", "clicks", "impressions"]));
  const [search, setSearch] = useState("");
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [subReports, setSubReports] = useState<SubReport[]>([]);
  const [activeSubReport, setActiveSubReport] = useState<SubReport | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}/sub-reports?channel=google`)
      .then((r) => r.json()).then((d) => setSubReports(d.subReports ?? [])).catch(() => {});
  }, [token]);

  const fetchData = useCallback(async (start: string, end: string) => {
    if (!start || !end || start > end) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/share/${token}/campaigns?startDate=${start}&endDate=${end}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json as CampaignData);
      setSelectedCampaigns(new Set((json as CampaignData).campaigns.map((c: CampaignMetric) => c.id)));
      setActiveSubReport(null);
    } catch { setData(null); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(startDate, endDate); }, [startDate, endDate, fetchData]);

  function handleMonthChange(months: string[], range: { start: string; end: string } | null) {
    setSelectedMonths(months);
    if (range) { setStartDate(range.start); setEndDate(range.end); }
  }

  const filteredCampaigns = useMemo(() => {
    if (!data) return [];
    return data.campaigns.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const dayMap = new Map<string, { date: string; impressions: number; clicks: number; costBRL: number; conversions: number }>();
    for (const d of data.dailyMetrics.filter((d) => selectedCampaigns.has(d.campaignId))) {
      const existing = dayMap.get(d.date);
      if (existing) {
        existing.impressions += d.impressions;
        existing.clicks      += d.clicks;
        existing.costBRL     += d.costBRL;
        existing.conversions += d.conversions;
      } else {
        dayMap.set(d.date, { date: d.date, impressions: d.impressions, clicks: d.clicks, costBRL: d.costBRL, conversions: d.conversions });
      }
    }
    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, selectedCampaigns]);

  const totals = useMemo(() => {
    const sel = data?.campaigns.filter((c) => selectedCampaigns.has(c.id)) ?? [];
    const impressions = sel.reduce((s, c) => s + Number(c.impressions), 0);
    const clicks      = sel.reduce((s, c) => s + Number(c.clicks), 0);
    const costBRL     = sel.reduce((s, c) => s + Number(c.costBRL), 0);
    const conversions = sel.reduce((s, c) => s + Number(c.conversions), 0);
    return { impressions, clicks, costBRL, conversions, ctr: impressions > 0 ? (clicks / impressions) * 100 : 0, cpc: clicks > 0 ? costBRL / clicks : 0 };
  }, [data, selectedCampaigns]);

  const tableCampaigns = useMemo(() => (data?.campaigns ?? []).filter((c) => selectedCampaigns.has(c.id)), [data, selectedCampaigns]);

  function handleSelectSubReport(sr: SubReport | null) {
    setActiveSubReport(sr);
    setSelectedCampaigns(sr ? new Set(sr.campaignIds) : new Set(data?.campaigns.map((c) => c.id) ?? []));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <MonthYearPicker selected={selectedMonths} onChange={handleMonthChange} />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500 shrink-0">De</label>
            <input type="date" value={startDate} max={endDate} onChange={(e) => { setStartDate(e.target.value); setSelectedMonths([]); }} className="h-9 px-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500 shrink-0">até</label>
            <input type="date" value={endDate} min={startDate} max={toInputDate(new Date())} onChange={(e) => { setEndDate(e.target.value); setSelectedMonths([]); }} className="h-9 px-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
        </div>
        <SubReportChips subReports={subReports} activeId={activeSubReport?.id ?? null} onSelect={handleSelectSubReport} onEdit={() => {}} readOnly />
        <div className="relative">
          <button onClick={() => setDropdownOpen((o) => !o)} className="h-9 flex items-center gap-2 pl-3 pr-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white hover:border-slate-400 transition min-w-[220px]">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
            <span className="flex-1 text-left text-slate-600 truncate">{selectedCampaigns.size === 0 ? "Nenhuma campanha" : selectedCampaigns.size === data?.campaigns.length ? "Todas as campanhas" : `${selectedCampaigns.size} campanha${selectedCampaigns.size > 1 ? "s" : ""}`}</span>
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {dropdownOpen && (
            <div className="absolute top-10 left-0 z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-xl">
              <div className="p-2 border-b border-slate-100">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar campanha..." autoFocus className="w-full px-3 py-2 text-sm text-[#333333] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="p-2 border-b border-slate-100">
                <button onClick={() => setSelectedCampaigns(selectedCampaigns.size === filteredCampaigns.length ? new Set() : new Set(filteredCampaigns.map((c) => c.id)))} className="w-full text-left px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  {selectedCampaigns.size === filteredCampaigns.length ? "Desmarcar todas" : "Selecionar todas"}
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto p-2 space-y-0.5">
                {filteredCampaigns.map((c) => (
                  <button key={c.id} onClick={() => setSelectedCampaigns((prev) => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition text-left">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${selectedCampaigns.has(c.id) ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                      {selectedCampaigns.has(c.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-xs text-slate-700 truncate">{c.name}</span>
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-slate-100">
                <button onClick={() => setDropdownOpen(false)} className="w-full text-center text-xs text-slate-500 hover:text-slate-700 py-2 border border-slate-200 rounded-lg transition">Fechar</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}</div>
          <div className="h-72 bg-slate-100 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Valor Gasto",  value: fmtBRL(totals.costBRL),    color: "text-blue-600"   },
              { label: "Conversões",   value: fmtNum(totals.conversions), color: "text-emerald-600"},
              { label: "Cliques",      value: fmtNum(totals.clicks),      color: "text-amber-600"  },
              { label: "Impressões",   value: fmtNum(totals.impressions), color: "text-purple-600" },
              { label: "CTR",          value: fmtPct(totals.ctr),         color: "text-slate-700"  },
              { label: "CPC Médio",    value: fmtBRL(totals.cpc),         color: "text-slate-700"  },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-[70%] bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {GOOGLE_METRICS.map((m) => (
                  <button key={m.key} onClick={() => setVisibleMetrics((prev) => { const n = new Set(prev); n.has(m.key) ? n.delete(m.key) : n.add(m.key); return n; })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${visibleMetrics.has(m.key) ? "text-white border-transparent" : "bg-white text-slate-400 border-slate-200"}`}
                    style={visibleMetrics.has(m.key) ? { background: m.color, borderColor: m.color } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ background: visibleMetrics.has(m.key) ? "white" : m.color }} />
                    {m.label}
                  </button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="money" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} width={52} />
                  <YAxis yAxisId="volume" orientation="left" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} width={44} />
                  <YAxis yAxisId="small" hide />
                  <Tooltip content={<ChartTooltipGoogle />} />
                  {GOOGLE_METRICS.map((m) => visibleMetrics.has(m.key) ? <Line key={m.key} yAxisId={m.yAxisId} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} /> : null)}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:w-[30%] bg-white border border-slate-200 rounded-xl p-5">
              <FunnelMetrics totals={totals} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <h2 className="font-semibold text-slate-800 text-sm">Campanhas no período<span className="ml-2 text-slate-400 font-normal">({tableCampaigns.length})</span></h2>
              {activeSubReport && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{activeSubReport.name}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50">{["Campanha","Valor Investido","Impressões","Cliques","Conversões","CTR","Custo/Conv."].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {tableCampaigns.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">Nenhuma campanha selecionada</td></tr>
                    : tableCampaigns.map((c: CampaignMetric) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-[220px] truncate">{c.name}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtBRL(c.costBRL)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtNum(c.impressions)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtNum(c.clicks)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtNum(c.conversions)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtPct(c.ctr)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{c.conversions > 0 ? fmtBRL(c.costPerConversion) : "—"}</td>
                      </tr>
                    ))}
                </tbody>
                {tableCampaigns.length > 0 && (
                  <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">TOTAL</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtBRL(totals.costBRL)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtNum(totals.impressions)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtNum(totals.clicks)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtNum(totals.conversions)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtPct(totals.ctr)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{totals.conversions > 0 ? fmtBRL(totals.costBRL / totals.conversions) : "—"}</td>
                  </tr></tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Meta Tab ──────────────────────────────────────────────────────────────────
type MetaMetricKey = "spend" | "conversions" | "impressions" | "clicks";
const META_METRICS: { key: MetaMetricKey; label: string; color: string; yAxisId: string }[] = [
  { key: "spend",       label: "Valor Gasto",  color: "#1877F2", yAxisId: "money"  },
  { key: "conversions", label: "Conversões",   color: "#10B981", yAxisId: "small"  },
  { key: "clicks",      label: "Cliques",      color: "#F59E0B", yAxisId: "volume" },
  { key: "impressions", label: "Impressões",   color: "#8B5CF6", yAxisId: "volume" },
];

function MetaTab({ client, token }: { client: Client; token: string }) {
  const init = useMemo(() => defaultRange(), []);
  const [startDate, setStartDate] = useState(init.start);
  const [endDate, setEndDate] = useState(init.end);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [data, setData] = useState<MetaCampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleMetrics, setVisibleMetrics] = useState<Set<MetaMetricKey>>(new Set(["spend", "conversions", "clicks", "impressions"]));
  const [search, setSearch] = useState("");
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [subReports, setSubReports] = useState<SubReport[]>([]);
  const [activeSubReport, setActiveSubReport] = useState<SubReport | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}/sub-reports?channel=meta`)
      .then((r) => r.json()).then((d) => setSubReports(d.subReports ?? [])).catch(() => {});
  }, [token]);

  const fetchData = useCallback(async (start: string, end: string) => {
    if (!start || !end || start > end) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/share/${token}/meta-campaigns?startDate=${start}&endDate=${end}`);
      const json: MetaCampaignData = await res.json();
      setData(json);
      setSelectedCampaigns(new Set(json.campaigns.map((c) => c.id)));
      setActiveSubReport(null);
    } catch { setData(null); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchData(startDate, endDate); }, [startDate, endDate, fetchData]);

  function handleMonthChange(months: string[], range: { start: string; end: string } | null) {
    setSelectedMonths(months);
    if (range) { setStartDate(range.start); setEndDate(range.end); }
  }

  const filteredCampaigns = useMemo(() => {
    if (!data) return [];
    return data.campaigns.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const chartData = useMemo(() => {
    if (!data) return [];
    const dayMap = new Map<string, { date: string; impressions: number; clicks: number; spend: number; conversions: number }>();
    for (const d of data.dailyMetrics.filter((d) => selectedCampaigns.has(d.campaignId))) {
      const existing = dayMap.get(d.date);
      if (existing) {
        existing.impressions += d.impressions;
        existing.clicks      += d.clicks;
        existing.spend       += d.spend;
        existing.conversions += d.conversions;
      } else {
        dayMap.set(d.date, { date: d.date, impressions: d.impressions, clicks: d.clicks, spend: d.spend, conversions: d.conversions });
      }
    }
    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [data, selectedCampaigns]);

  const totals = useMemo(() => {
    const sel = data?.campaigns.filter((c) => selectedCampaigns.has(c.id)) ?? [];
    const impressions = sel.reduce((s, c) => s + c.impressions, 0);
    const clicks      = sel.reduce((s, c) => s + c.clicks, 0);
    const spend       = sel.reduce((s, c) => s + c.spend, 0);
    const conversions = sel.reduce((s, c) => s + c.conversions, 0);
    return { impressions, clicks, spend, conversions, ctr: impressions > 0 ? (clicks / impressions) * 100 : 0, cpc: clicks > 0 ? spend / clicks : 0 };
  }, [data, selectedCampaigns]);

  const tableCampaigns = useMemo(() => (data?.campaigns ?? []).filter((c) => selectedCampaigns.has(c.id)), [data, selectedCampaigns]);

  function handleSelectSubReport(sr: SubReport | null) {
    setActiveSubReport(sr);
    setSelectedCampaigns(sr ? new Set(sr.campaignIds) : new Set(data?.campaigns.map((c) => c.id) ?? []));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <MonthYearPicker selected={selectedMonths} onChange={handleMonthChange} />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500 shrink-0">De</label>
            <input type="date" value={startDate} max={endDate} onChange={(e) => { setStartDate(e.target.value); setSelectedMonths([]); }} className="h-9 px-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-slate-500 shrink-0">até</label>
            <input type="date" value={endDate} min={startDate} max={toInputDate(new Date())} onChange={(e) => { setEndDate(e.target.value); setSelectedMonths([]); }} className="h-9 px-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
        </div>
        <SubReportChips subReports={subReports} activeId={activeSubReport?.id ?? null} onSelect={handleSelectSubReport} onEdit={() => {}} readOnly />
        <div className="relative">
          <button onClick={() => setDropdownOpen((o) => !o)} className="h-9 flex items-center gap-2 pl-3 pr-3 border border-slate-300 rounded-lg text-sm text-[#333333] bg-white hover:border-slate-400 transition min-w-[220px]">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
            <span className="flex-1 text-left text-slate-600 truncate">{selectedCampaigns.size === 0 ? "Nenhuma campanha" : selectedCampaigns.size === data?.campaigns.length ? "Todas as campanhas" : `${selectedCampaigns.size} campanha${selectedCampaigns.size > 1 ? "s" : ""}`}</span>
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {dropdownOpen && (
            <div className="absolute top-10 left-0 z-50 w-80 bg-white border border-slate-200 rounded-xl shadow-xl">
              <div className="p-2 border-b border-slate-100">
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar campanha..." autoFocus className="w-full px-3 py-2 text-sm text-[#333333] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="p-2 border-b border-slate-100">
                <button onClick={() => setSelectedCampaigns(selectedCampaigns.size === filteredCampaigns.length ? new Set() : new Set(filteredCampaigns.map((c) => c.id)))} className="w-full text-left px-2 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition">
                  {selectedCampaigns.size === filteredCampaigns.length ? "Desmarcar todas" : "Selecionar todas"}
                </button>
              </div>
              <div className="max-h-56 overflow-y-auto p-2 space-y-0.5">
                {filteredCampaigns.map((c) => (
                  <button key={c.id} onClick={() => setSelectedCampaigns((prev) => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition text-left">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${selectedCampaigns.has(c.id) ? "bg-blue-600 border-blue-600" : "border-slate-300"}`}>
                      {selectedCampaigns.has(c.id) && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <span className="text-xs text-slate-700 truncate">{c.name}</span>
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-slate-100">
                <button onClick={() => setDropdownOpen(false)} className="w-full text-center text-xs text-slate-500 hover:text-slate-700 py-2 border border-slate-200 rounded-lg transition">Fechar</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">{[...Array(6)].map((_, i) => <div key={i} className="h-20 bg-slate-100 rounded-xl" />)}</div>
          <div className="h-72 bg-slate-100 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Valor Gasto",  value: fmtBRL(totals.spend),         color: "text-[#1877F2]"  },
              { label: "Conversões",   value: fmtNum(totals.conversions),    color: "text-emerald-600"},
              { label: "Cliques",      value: fmtNum(totals.clicks),         color: "text-amber-600"  },
              { label: "Impressões",   value: fmtNum(totals.impressions),    color: "text-purple-600" },
              { label: "CTR",          value: fmtPct(totals.ctr),            color: "text-slate-700"  },
              { label: "CPC Médio",    value: fmtBRL(totals.cpc),            color: "text-slate-700"  },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500 mb-1">{kpi.label}</p>
                <p className={`text-lg font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="lg:w-[70%] bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex flex-wrap items-center gap-2 mb-5">
                {META_METRICS.map((m) => (
                  <button key={m.key} onClick={() => setVisibleMetrics((prev) => { const n = new Set(prev); n.has(m.key) ? n.delete(m.key) : n.add(m.key); return n; })}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${visibleMetrics.has(m.key) ? "text-white border-transparent" : "bg-white text-slate-400 border-slate-200"}`}
                    style={visibleMetrics.has(m.key) ? { background: m.color, borderColor: m.color } : {}}>
                    <span className="w-2 h-2 rounded-full" style={{ background: visibleMetrics.has(m.key) ? "white" : m.color }} />
                    {m.label}
                  </button>
                ))}
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tickFormatter={(v) => v.split("-")[2]} tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="money" orientation="right" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} width={52} />
                  <YAxis yAxisId="volume" orientation="left" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} width={44} />
                  <YAxis yAxisId="small" hide />
                  <Tooltip content={<ChartTooltipMeta />} />
                  {META_METRICS.map((m) => visibleMetrics.has(m.key) ? <Line key={m.key} yAxisId={m.yAxisId} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} /> : null)}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:w-[30%] bg-white border border-slate-200 rounded-xl p-5">
              <FunnelMetrics totals={totals} />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <h2 className="font-semibold text-slate-800 text-sm">Campanhas com impressões no período<span className="ml-2 text-slate-400 font-normal">({tableCampaigns.length})</span></h2>
              {activeSubReport && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{activeSubReport.name}</span>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50">{["Campanha","Valor Investido","Impressões","Cliques","Conversões","CTR","Custo/Conv."].map((h) => <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {tableCampaigns.length === 0 ? <tr><td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">Nenhuma campanha selecionada</td></tr>
                    : tableCampaigns.map((c: MetaCampaignMetric) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-medium text-slate-800 max-w-[220px] truncate">{c.name}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtBRL(c.spend)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtNum(c.impressions)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtNum(c.clicks)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtNum(c.conversions)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{fmtPct(c.ctr)}</td>
                        <td className="px-4 py-3 text-slate-700 tabular-nums">{c.conversions > 0 ? fmtBRL(c.costPerConversion) : "—"}</td>
                      </tr>
                    ))}
                </tbody>
                {tableCampaigns.length > 0 && (
                  <tfoot><tr className="border-t-2 border-slate-200 bg-slate-50">
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">TOTAL</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtBRL(totals.spend)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtNum(totals.impressions)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtNum(totals.clicks)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtNum(totals.conversions)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{fmtPct(totals.ctr)}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-800 tabular-nums">{totals.conversions > 0 ? fmtBRL(totals.spend / totals.conversions) : "—"}</td>
                  </tr></tfoot>
                )}
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltipGoogle({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">Dia {label?.split("-")[2]}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} /><span className="text-slate-600">{p.name}</span></span>
          <span className="font-medium text-slate-800">{p.name === "Valor Gasto" ? p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : p.name === "Impressões" || p.name === "Cliques" ? p.value.toLocaleString("pt-BR") : p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltipMeta({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-4 py-3 text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-slate-700 mb-2">Dia {label?.split("-")[2]}</p>
      {payload.map((p: { name: string; value: number; color: string }) => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: p.color }} /><span className="text-slate-600">{p.name}</span></span>
          <span className="font-medium text-slate-800">{p.name === "Valor Gasto" ? p.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : p.name === "Impressões" || p.name === "Cliques" ? p.value.toLocaleString("pt-BR") : p.value.toFixed(1)}</span>
        </div>
      ))}
    </div>
  );
}
