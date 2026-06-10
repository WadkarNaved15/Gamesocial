import { useState, useEffect, useCallback, useRef, useMemo, createContext, useContext } from "react";
import axios from "axios";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, AreaChart, Area, LineChart, Line, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus =
  | "waiting" | "allocation_ready" | "assigning"
  | "starting" | "running" | "ending" | "ended" | "failed";
type SessionPhase = "countdown" | "downloading" | "launching" | null;
type ExitReason =
  | "user_exit" | "timeout" | "disconnect" | "spot_interrupt"
  | "crash" | "error" | "user_abandoned" | "countdown_expired"
  | "user_cancelled" | "stale_abandoned" | "credits_exhausted";
type HealthStatus =
  | "Healthy"
  | "Good"
  | "Warning"
  | "Critical";

type RangeKey =
  | "today" | "yesterday" | "7d" | "30d"
  | "thisMonth" | "lastMonth" | "3m" | "6m"
  | "thisYear" | "all" | "custom";

interface DateRange {
  range: RangeKey;
  from?: string;
  to?: string;
}

interface SessionOverview {
  rangeLabel: string;
  activeSessions: number; runningSessions: number; waitingSessions: number; startingSessions: number;
  totalSessions: number; completedSessions: number; failedSessions: number;
  successRate: number; failureRate: number;
  avgSessionDuration: number; medianSessionDuration: number; longestSession: number; shortestSession: number;
  avgQueueTime: number;
  totalCreditsConsumed: number; avgCreditsPerSession: number; creditsBurnedPerDay: number;
  creditsBurnedPerUser: number; creditsBurnedPerGame: number;
  totalPlayTime: number; avgPlayTimePerSession: number; avgPlayTimePerUser: number;
}

interface TrendPoint { date: string; sessions: number; failures: number; credits: number; crashes: number; disconnects: number; playTime: number; }
interface TrendData   { groupBy: string; rows: TrendPoint[]; }
interface ExitReasonStat { reason: ExitReason; count: number; pct: number; trend: number; }

interface GameHealthRecord {
  _id: string; gameName: string; creator: string;
  activeSessions: number; totalSessions: number; uniquePlayers: number;
  avgDuration: number; totalPlayTime: number; creditsBurned: number; avgCreditsPerSession: number;
  failureRate: number; crashRate: number; disconnectRate: number;
  sessionTrend: number; failureTrend: number;
  queueUsage: { direct: number; queued: number };
  healthScore: number;
  healthStatus: "Healthy" | "Good" | "Warning" | "Critical";
}

interface SessionListItem {
  _id: string;
  user: { _id: string; username: string };
  game: string; status: SessionStatus; phase: SessionPhase;
  queueType: "direct" | "queued"; region: string;
  startedAt: string; endedAt: string | null;
  duration: number; totalPlayTime?: number; credits: number;
  exitReason: ExitReason | null; instanceId: string | null; instanceIp: string | null;
}

interface SessionDetail extends SessionListItem {
  gameId: string; creator: string;
  createdAt: string; lastHeartbeat: string | null; leaseToken: string | null; leaseExpiresAt: string | null;
  exitCode: string | null; error: string | null;
  billing: { creditsConsumed: number; billedPlayTime: number; lastBilledAt: string | null } | null;
  metrics: { totalPlayTime: number; effectiveSessionDuration: number } | null;
  countdownStartedAt: string | null; countdownSeconds: number | null;
}

interface LiveSessionsData {
  running: SessionListItem[]; waiting: SessionListItem[];
  allocationReady: SessionListItem[]; starting: SessionListItem[];
}

interface UserSessionSummary {
  user: { _id: string; username: string; email: string };
  summary: {
    totalSessions: number; totalPlayTime: number; creditsConsumed: number;
    avgSessionDuration: number; failures: number; disconnects: number;
    failureRate: number; successRate: number;
  };
  favoriteGames: { _id: string; gameName: string; count: number }[];
  mostActiveRegion: string | null;
  regionBreakdown: { _id: string; count: number }[];
  recentSessions: SessionListItem[];
}

interface RegionStat {
  region: string; sessions: number; failures: number; failureRate: number;
  avgDuration: number; creditsBurned: number; totalPlayTime: number;
  activePlayers: number; activeGames: number; sessionTrend: number;
}

interface QueueStats {
  currentLength: number; totalQueued: number; avgWaitTime: number; maxWaitTime: number;
  successRate: number; abandonmentRate: number; conversionRate: number;
  trend: { date: string; queued: number; converted: number; abandoned: number; avgWait: number }[];
}

interface FailureData {
  trend: { date: string; crashes: number; disconnects: number; timeouts: number; abandoned: number; countdownExpired: number; creditExhausted: number; total: number }[];
  sessions: PaginatedResponse<SessionListItem>;
}

interface PaginatedResponse<T> { rows: T[]; total: number; page: number; pageSize: number; totalPages: number; }

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = `${import.meta.env.VITE_BACKEND_URL}/api/admin/sessionMonitoring`;

const EXIT_REASON_COLORS: Record<string, string> = {
  user_exit: "#3D7A6E", timeout: "#f4a261", disconnect: "#ef4444",
  spot_interrupt: "#8b5cf6", crash: "#dc2626", error: "#991b1b",
  user_abandoned: "#6b7280", countdown_expired: "#f59e0b",
  user_cancelled: "#78716c", stale_abandoned: "#44403c", credits_exhausted: "#b45309",
};

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "today",      label: "Today"        },
  { value: "yesterday",  label: "Yesterday"    },
  { value: "7d",         label: "Last 7 Days"  },
  { value: "30d",        label: "Last 30 Days" },
  { value: "thisMonth",  label: "This Month"   },
  { value: "lastMonth",  label: "Last Month"   },
  { value: "3m",         label: "Last 3 Months"},
  { value: "6m",         label: "Last 6 Months"},
  { value: "thisYear",   label: "This Year"    },
  { value: "all",        label: "All Time"     },
  { value: "custom",     label: "Custom Range…"},
];

const NAV_ITEMS = [
  { id: "overview",  label: "Health Overview",    icon: "⬡" },
  { id: "live",      label: "Live Monitor",       icon: "◉" },
  { id: "outcomes",  label: "Session Outcomes",   icon: "◎" },
  { id: "games",     label: "Game Health",        icon: "▣" },
  { id: "explorer",  label: "Session Explorer",   icon: "⊟" },
  { id: "users",     label: "User Investigation", icon: "⊙" },
  { id: "failures",  label: "Failure Investigation", icon: "⚠" },
  { id: "regions",   label: "Region Analytics",   icon: "◈" },
  { id: "queue",     label: "Queue Analytics",    icon: "≡" },
] as const;
type NavId = typeof NAV_ITEMS[number]["id"];

// ─── Date Range Context ───────────────────────────────────────────────────────

const DateRangeCtx = createContext<{ dr: DateRange; setDr: (d: DateRange) => void }>({
  dr: { range: "30d" },
  setDr: () => {},
});
const useDateRange = () => useContext(DateRangeCtx);

function drToParams(dr: DateRange): Record<string, string | undefined> {
  if (dr.range === "custom") return { from: dr.from, to: dr.to };
  return { range: dr.range };
}

// ─── API ──────────────────────────────────────────────────────────────────────

const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

async function apiFetch<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const res = await api.get<{ success: boolean; data: T }>(path, { params });
  return res.data.data;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtDuration = (ms: number | null | undefined): string => {
  if (!ms) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};
const fmtNum = (n: number | null | undefined): string => {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};
const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};
const fmtTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
};
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const fmtTrend = (n: number) => n === 0 ? "—" : `${n > 0 ? "▲" : "▼"} ${Math.abs(n)}%`;

// ─── Design Atoms ─────────────────────────────────────────────────────────────

function GlassCard({ children, className = "", onClick, accent = false }: {
  children: React.ReactNode; className?: string; onClick?: () => void; accent?: boolean;
}) {
  return (
    <div onClick={onClick} className={[
      "rounded-2xl border backdrop-blur-md",
      accent ? "bg-teal-900/20 border-teal-600/30" : "bg-white/[0.04] border-white/[0.08]",
      onClick ? "cursor-pointer hover:border-teal-600/40 transition-all duration-200" : "",
      className,
    ].join(" ")}>{children}</div>
  );
}

function KpiCard({ label, value, sub, accent = "default", icon }: {
  label: string; value: string; sub?: string;
  accent?: "default"|"teal"|"green"|"red"|"amber"|"blue"; icon?: string;
}) {
  const accentMap: Record<string, string> = {
    default:"text-white/90", teal:"text-teal-400", green:"text-green-400",
    red:"text-red-400", amber:"text-amber-400", blue:"text-blue-400",
  };
  return (
    <GlassCard className="p-4 flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">{label}</span>
        {icon && <span className="text-white/20 text-base">{icon}</span>}
      </div>
      <span className={`text-2xl font-bold leading-none tabular-nums ${accentMap[accent]}`}>{value}</span>
      {sub && <span className="text-[11px] text-white/25">{sub}</span>}
    </GlassCard>
  );
}

function StatusBadge({ status }: { status: SessionStatus }) {
  const map: Record<string, string> = {
    waiting:"bg-teal-900/30 text-teal-400 border-teal-600/30",
    allocation_ready:"bg-teal-800/30 text-teal-300 border-teal-500/30",
    starting:"bg-blue-900/30 text-blue-400 border-blue-600/30",
    running:"bg-green-900/30 text-green-400 border-green-600/30",
    ending:"bg-amber-900/30 text-amber-400 border-amber-600/30",
    ended:"bg-white/5 text-white/40 border-white/10",
    failed:"bg-red-900/30 text-red-400 border-red-600/30",
    assigning:"bg-purple-900/30 text-purple-400 border-purple-600/30",
  };
  return <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${map[status] ?? map.ended}`}>{status?.replace(/_/g," ")}</span>;
}

function PhaseBadge({ phase }: { phase: SessionPhase }) {
  if (!phase) return <span className="text-white/20 text-[10px]">—</span>;
  const map: Record<string,string> = {
    countdown:"bg-amber-900/30 text-amber-400 border-amber-600/30",
    downloading:"bg-blue-900/30 text-blue-400 border-blue-600/30",
    launching:"bg-teal-900/30 text-teal-400 border-teal-600/30",
  };
  return <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${map[phase] ?? ""}`}>{phase}</span>;
}

function HealthBadge({ score }: { score: HealthStatus }) {
  const map: Record<HealthStatus,string> = {
    Healthy:"bg-green-900/30 text-green-400 border-green-600/30",
    Good:"bg-emerald-900/30 text-emerald-400 border-emerald-600/30",
    Warning:"bg-amber-900/30 text-amber-400 border-amber-600/30",
    Critical:"bg-red-900/30 text-red-400 border-red-600/30",
  };
  return <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${map[score]}`}>{score}</span>;
}

function ExitReasonBadge({ reason }: { reason: ExitReason | null | undefined }) {
  if (!reason) return <span className="text-white/20">—</span>;
  return (
    <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10 bg-white/5 whitespace-nowrap"
      style={{ color: EXIT_REASON_COLORS[reason] ?? "#6b7280" }}>
      {reason.replace(/_/g," ")}
    </span>
  );
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-white/25 text-[10px]">—</span>;
  return <span className={`text-[10px] font-bold ${value > 0 ? "text-red-400" : "text-green-400"}`}>{fmtTrend(value)}</span>;
}

function SectionHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-0.5 h-5 rounded-sm bg-teal-600" />
          <h2 className="text-base font-bold text-white/90 m-0">{title}</h2>
        </div>
        {sub && <p className="text-[12px] text-white/35 pl-3 m-0">{sub}</p>}
      </div>
      {actions && <div className="flex gap-2 items-center">{actions}</div>}
    </div>
  );
}

function Btn({ children, onClick, variant = "ghost", disabled, className = "", size = "sm", loading }: {
  children: React.ReactNode; onClick?: () => void;
  variant?: "ghost"|"teal"|"danger"|"amber"; disabled?: boolean;
  className?: string; size?: "sm"|"md"; loading?: boolean;
}) {
  const variants: Record<string,string> = {
    ghost:"bg-white/5 border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/15",
    teal:"bg-teal-700/40 border border-teal-600/40 text-teal-300 hover:bg-teal-700/60",
    danger:"bg-red-900/30 border border-red-600/30 text-red-400 hover:bg-red-900/50",
    amber:"bg-amber-900/30 border border-amber-600/30 text-amber-400 hover:bg-amber-900/50",
  };
  const sizes: Record<string,string> = { sm:"px-3 py-1.5 text-[11px]", md:"px-4 py-2 text-[12px]" };
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 rounded-xl font-semibold transition-all duration-150 ${variants[variant]} ${sizes[size]} ${(disabled||loading)?"opacity-40 cursor-not-allowed":"cursor-pointer"} ${className}`}>
      {loading ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : children}
    </button>
  );
}

function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder: string;
}) {
  return <input value={value} onChange={onChange} placeholder={placeholder}
    className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-[13px] text-white/90 placeholder-white/25 outline-none focus:border-teal-600/50 transition-colors w-full" />;
}

function SelectFilter({ value, onChange, options, className = "" }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <select value={value} onChange={onChange}
      className={`bg-[#161616] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-[11px] text-white/70 outline-none focus:border-teal-600/50 transition-colors ${className}`}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function Spinner() {
  return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-teal-600/30 border-t-teal-600 rounded-full animate-spin" /></div>;
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-900/20 border border-red-600/20 text-red-400 text-[12px] mb-4">
      <span>⚠ {message}</span>
      {onRetry && <Btn onClick={onRetry} variant="danger" size="sm">Retry</Btn>}
    </div>
  );
}

function LiveDot({ color = "#3D7A6E" }: { color?: string }) {
  return (
    <span className="relative inline-flex w-2 h-2">
      <span className="absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping" style={{ backgroundColor: color }} />
      <span className="relative inline-flex w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

function RigzerTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ color: string; name: string; value: number | string }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a1a1a] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl">
      {label && <div className="text-[10px] text-white/35 mb-1.5 font-semibold uppercase tracking-wide">{label}</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-[12px]">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-white/50">{p.name}:</span>
          <span className="text-white/90 font-semibold tabular-nums">{typeof p.value === "number" ? fmtNum(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  return (
    <div className="flex gap-1.5">
      <Btn disabled={page <= 1}          onClick={() => onPage(1)}>«</Btn>
      <Btn disabled={page <= 1}          onClick={() => onPage(page - 1)}>‹</Btn>
      <span className="px-2.5 py-1 text-[11px] text-white/50 font-mono">{page}</span>
      <Btn disabled={page >= totalPages} onClick={() => onPage(page + 1)}>›</Btn>
      <Btn disabled={page >= totalPages} onClick={() => onPage(totalPages)}>»</Btn>
    </div>
  );
}

// ─── Global Date Range Picker ─────────────────────────────────────────────────

function DateRangePicker() {
  const { dr, setDr } = useDateRange();
  const [showCustom, setShowCustom] = useState(false);
  const [from, setFrom] = useState(dr.from ?? "");
  const [to,   setTo]   = useState(dr.to   ?? "");

  const handleRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value as RangeKey;
    if (v === "custom") { setShowCustom(true); return; }
    setShowCustom(false);
    setDr({ range: v });
  };

  const applyCustom = () => {
    if (!from && !to) return;
    setDr({ range: "custom", from, to });
    setShowCustom(false);
  };

  const label = RANGE_OPTIONS.find((o) => o.value === dr.range)?.label
    ?? (dr.range === "custom" ? `${dr.from ?? "∞"} → ${dr.to ?? "now"}` : "");

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5">
        <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Range</span>
        <select
          value={dr.range}
          onChange={handleRangeChange}
          className="bg-transparent text-[11px] text-teal-400 font-semibold outline-none cursor-pointer"
        >
          {RANGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {showCustom && (
        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-teal-600/30 rounded-xl px-3 py-1.5">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="bg-transparent text-[11px] text-white/70 outline-none" />
          <span className="text-white/25 text-[10px]">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="bg-transparent text-[11px] text-white/70 outline-none" />
          <Btn onClick={applyCustom} variant="teal" size="sm">Apply</Btn>
        </div>
      )}
    </div>
  );
}

// ─── usePoller hook ───────────────────────────────────────────────────────────

function usePoller<T>(fetcher: () => Promise<T>, intervalMs: number, deps: React.DependencyList = []) {
  const [data, setData]       = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (e) {
      setError(axios.isAxiosError(e) ? (e.response?.data?.message ?? e.message) : (e instanceof Error ? e.message : "Unknown error"));
    } finally { setLoading(false); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    setLoading(true);
    load();
    if (intervalMs > 0) { const id = setInterval(load, intervalMs); return () => clearInterval(id); }
  }, [load, intervalMs]);

  return { data, loading, error, refresh: load };
}

// ─── Session Drawer (full detail) ─────────────────────────────────────────────

function SessionDrawer({ sessionId, sessionPreview, onClose }: {
  sessionId: string; sessionPreview: SessionListItem; onClose: () => void;
}) {
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);

  useEffect(() => {
    apiFetch<SessionDetail>(`/sessions/${sessionId}`)
      .then(setDetail)
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [sessionId]);

  const session = detail ?? sessionPreview as unknown as SessionDetail;

  const lifecycle = [
    { label: "waiting",          ts: session.startedAt   },
    { label: "allocation_ready", ts: null },
    { label: "starting",         ts: null },
    { label: "running",          ts: session.startedAt   },
    { label: "ending",           ts: null },
    { label: session.status === "failed" ? "failed" : "ended", ts: session.endedAt },
  ];
  const currentIdx = lifecycle.findIndex((s) => s.label === session.status);

  return (
    <div className="fixed top-0 right-0 bottom-0 w-[440px] z-[300] flex flex-col overflow-hidden"
      style={{ background:"linear-gradient(135deg,rgba(61,122,110,0.12) 0%,rgba(13,13,13,0.97) 100%)", borderLeft:"1px solid rgba(61,122,110,0.25)", backdropFilter:"blur(24px)" }}>
      <div className="px-5 py-4 border-b border-white/[0.07] flex justify-between items-start shrink-0">
        <div>
          <div className="font-mono text-[11px] text-teal-500 mb-0.5">{session._id}</div>
          <div className="font-bold text-[15px] text-white/90">{session.game}</div>
          <div className="text-[12px] text-white/40 mt-0.5">{session.user?.username}</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={session.status} />
          <button onClick={onClose} className="text-white/30 hover:text-white/70 bg-transparent border-none text-lg cursor-pointer ml-1">✕</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {detailLoading && <Spinner />}

        {/* Lifecycle */}
        <GlassCard className="p-4">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Lifecycle</div>
          <div className="relative">
            <div className="absolute left-2.5 top-3 bottom-3 w-px bg-white/10" />
            {lifecycle.map((step, i) => {
              const isPast = i < currentIdx; const isCurrent = i === currentIdx;
              return (
                <div key={step.label} className="flex items-center gap-3 mb-2.5 relative">
                  <div className={`relative z-10 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isCurrent?"border-teal-500 bg-teal-900/50":isPast?"border-teal-700 bg-teal-900/30":"border-white/10 bg-transparent"}`}>
                    {isPast    && <div className="w-1.5 h-1.5 rounded-full bg-teal-600" />}
                    {isCurrent && <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />}
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <span className={`text-[12px] font-semibold capitalize ${isCurrent?"text-teal-400":isPast?"text-white/50":"text-white/20"}`}>{step.label.replace(/_/g," ")}</span>
                    {step.ts && <span className="text-[10px] text-white/20 font-mono">{fmtTime(step.ts)}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* User & Game */}
        <GlassCard className="p-4">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">User & Game</div>
          <div className="flex flex-col gap-2 text-[12px]">
            {([
              ["User ID",   session.user?._id  || "—"],
              ["Username",  session.user?.username || "—"],
              ["Game ID",   (detail?.gameId ?? "—")],
              ["Creator",   (detail?.creator  ?? "—")],
            ] as [string,string][]).map(([k,v]) => (
              <div key={k} className="flex justify-between"><span className="text-white/35">{k}</span><span className="text-white/80 font-mono text-[10px]">{v}</span></div>
            ))}
          </div>
        </GlassCard>

        {/* Timestamps */}
        <GlassCard className="p-4">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Timestamps</div>
          <div className="flex flex-col gap-2 text-[12px]">
            {([
              ["Created",        detail?.createdAt     ?? null],
              ["Started",        session.startedAt     ?? null],
              ["Ended",          session.endedAt       ?? null],
              ["Last Heartbeat", detail?.lastHeartbeat ?? null],
            ] as [string,string|null][]).map(([k,v]) => (
              <div key={k} className="flex justify-between"><span className="text-white/35">{k}</span><span className="text-white/70 font-mono">{fmtDateTime(v)}</span></div>
            ))}
          </div>
        </GlassCard>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2">
          {([
            ["Duration",      fmtDuration(session.duration)],
            ["Play Time",     fmtDuration(detail?.metrics?.totalPlayTime)],
            ["Credits",       String(session.credits ?? 0)],
            ["Billed Time",   fmtDuration(detail?.billing?.billedPlayTime)],
            ["Region",        session.region    || "—"],
            ["Queue",         session.queueType || "direct"],
          ] as [string,string][]).map(([k,v]) => (
            <GlassCard key={k} className="p-3">
              <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">{k}</div>
              <div className="text-[13px] font-bold text-white/90 font-mono">{v}</div>
            </GlassCard>
          ))}
        </div>

        {/* Queue Info */}
        {detail?.countdownStartedAt && (
          <GlassCard className="p-4">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Queue Details</div>
            <div className="flex flex-col gap-2 text-[12px]">
              {([
                ["Countdown Started", fmtDateTime(detail.countdownStartedAt)],
                ["Countdown Seconds", String(detail.countdownSeconds ?? "—")],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k} className="flex justify-between"><span className="text-white/35">{k}</span><span className="text-white/80 font-mono">{v}</span></div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Allocation */}
        <GlassCard className="p-4">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Allocation</div>
          <div className="flex flex-col gap-2 text-[12px]">
            {([
              ["Instance ID", session.instanceId   || "—"],
              ["Instance IP", session.instanceIp   || "—"],
              ["Phase",       session.phase        || "—"],
              ["Lease Token", detail?.leaseToken?.substring(0,16)+"…" || "—"],
              ["Lease Expiry",fmtDateTime(detail?.leaseExpiresAt)],
            ] as [string,string][]).map(([k,v]) => (
              <div key={k} className="flex justify-between"><span className="text-white/35">{k}</span><span className="text-white/80 font-mono text-[10px]">{v}</span></div>
            ))}
          </div>
        </GlassCard>

        {/* Billing */}
        {detail?.billing && (
          <GlassCard className="p-4">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Billing</div>
            <div className="flex flex-col gap-2 text-[12px]">
              {([
                ["Credits Consumed",   String(detail.billing.creditsConsumed)],
                ["Billed Play Time",   fmtDuration(detail.billing.billedPlayTime)],
                ["Last Billed",        fmtDateTime(detail.billing.lastBilledAt)],
              ] as [string,string][]).map(([k,v]) => (
                <div key={k} className="flex justify-between"><span className="text-white/35">{k}</span><span className="text-white/80 font-mono">{v}</span></div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* Failure */}
        {(session.exitReason || detail?.error) && (
          <GlassCard className="p-4" accent>
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Failure Details</div>
            <div className="flex flex-col gap-2">
              <ExitReasonBadge reason={session.exitReason} />
              {detail?.exitCode && <div className="text-[11px] text-white/40 font-mono">Exit code: {detail.exitCode}</div>}
              {detail?.error    && <div className="text-[11px] text-red-400/70 font-mono break-all">{detail.error}</div>}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}

// ─── CSV Export helper ────────────────────────────────────────────────────────

function exportToCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const csv  = [headers.join(","), ...rows.map((r) => r.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Health Overview ──────────────────────────────────────────────────────────

function HealthOverview() {
  const { dr }  = useDateRange();
  const params  = drToParams(dr);
  const { data, loading, error, refresh } = usePoller<SessionOverview>(
    () => apiFetch("/sessions/overview", params), 15_000, [JSON.stringify(params)]
  );
  const { data: trendData } = usePoller<TrendData>(
    () => apiFetch("/sessions/trend", params), 60_000, [JSON.stringify(params)]
  );

  if (loading) return <Spinner />;
  if (error)   return <ErrorBanner message={error} onRetry={refresh} />;
  if (!data)   return null;

  const trend = trendData?.rows ?? [];

  return (
    <div>
      <SectionHeader title="Session Health Overview" sub={data.rangeLabel}
        actions={<Btn onClick={refresh} variant="teal" size="sm">↻ Refresh</Btn>} />

      {/* Session metrics */}
      <div className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2 pl-1">Session Metrics</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {([
          ["Total Sessions",    fmtNum(data.totalSessions),        "default", "▣"],
          ["Active",            fmtNum(data.activeSessions),        "teal",    "◉"],
          ["Completed",         fmtNum(data.completedSessions),     "green",   "⊟"],
          ["Failed",            fmtNum(data.failedSessions),        "red",     "✕"],
          ["Success Rate",      fmtPct(data.successRate),           data.successRate > 90 ? "green" : "amber", "⊙"],
          ["Failure Rate",      fmtPct(data.failureRate),           data.failureRate > 5  ? "red"   : "green", "⚠"],
          ["Avg Duration",      fmtDuration(data.avgSessionDuration),"default", "◷"],
          ["Median Duration",   fmtDuration(data.medianSessionDuration),"default","◎"],
          ["Longest Session",   fmtDuration(data.longestSession),   "amber",   "⬡"],
          ["Avg Queue Time",    fmtDuration(data.avgQueueTime),     "blue",    "≡"],
        ] as [string,string,string,string][]).map(([l,v,a,i]) =>
          <KpiCard key={l} label={l} value={v} accent={a as never} icon={i} />
        )}
      </div>

      {/* Usage metrics */}
      <div className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2 pl-1 mt-5">Usage Metrics</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
        {([
          ["Total Credits",      fmtNum(data.totalCreditsConsumed),  "teal",    "◈"],
          ["Avg Credits/Session",fmtNum(data.avgCreditsPerSession),   "default", "◈"],
          ["Credits/Day",        fmtNum(data.creditsBurnedPerDay),    "amber",   "◈"],
          ["Credits/User",       fmtNum(data.creditsBurnedPerUser),   "default", "◈"],
          ["Credits/Game",       fmtNum(data.creditsBurnedPerGame),   "default", "◈"],
        ] as [string,string,string,string][]).map(([l,v,a,i]) =>
          <KpiCard key={l} label={l} value={v} accent={a as never} icon={i} />
        )}
      </div>

      {/* Time metrics */}
      <div className="text-[10px] font-bold text-white/25 uppercase tracking-widest mb-2 pl-1 mt-5">Time Metrics</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
        {([
          ["Total Play Time",      fmtDuration(data.totalPlayTime),        "teal",    "◷"],
          ["Avg Play/Session",     fmtDuration(data.avgPlayTimePerSession), "default", "◷"],
          ["Avg Play/User",        fmtDuration(data.avgPlayTimePerUser),    "blue",    "◷"],
        ] as [string,string,string,string][]).map(([l,v,a,i]) =>
          <KpiCard key={l} label={l} value={v} accent={a as never} icon={i} />
        )}
      </div>

      {/* Charts */}
      {trend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Sessions vs Failures</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#3D7A6E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3D7A6E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<RigzerTooltip />} />
                <Area type="monotone" dataKey="sessions" name="Sessions" stroke="#3D7A6E" strokeWidth={2} fill="url(#sessGrad)" />
                <Area type="monotone" dataKey="failures" name="Failures" stroke="#ef4444" strokeWidth={1.5} fill="none" strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard className="p-4">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Credits Consumed</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trend} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<RigzerTooltip />} />
                <Bar dataKey="credits" name="Credits" fill="#3D7A6E" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// ─── Live Monitor ─────────────────────────────────────────────────────────────

const LIVE_BUCKET_META = [
  { key: "running"       as const, label: "Running",          color: "#52b788" },
  { key: "starting"      as const, label: "Starting",         color: "#2a9d8f" },
  { key: "allocationReady" as const, label: "Allocation Ready", color: "#3D7A6E" },
  { key: "waiting"       as const, label: "Waiting / Queue",  color: "#5bbfaa" },
];

function LiveMonitor() {
  const { data, loading, error, refresh } = usePoller<LiveSessionsData>(
    () => apiFetch("/sessions/live"), 5_000, []
  );
  const [selectedSession, setSelectedSession] = useState<SessionListItem | null>(null);
  const totals = data ? Object.values(data).flat().length : 0;

  return (
    <div>
      <SectionHeader title="Live Session Monitor" sub="Real-time only — no date filter"
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] text-teal-400"><LiveDot /> Live ({totals})</div>
            <Btn onClick={refresh} variant="ghost" size="sm">↻</Btn>
          </div>
        } />
      {error && <ErrorBanner message={error} onRetry={refresh} />}

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {LIVE_BUCKET_META.map(({ key, label, color }) => (
            <GlassCard key={key} className="p-4 flex flex-col gap-1.5">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">{label}</span>
              </div>
              <span className="text-2xl font-bold tabular-nums" style={{ color }}>{data[key].length}</span>
            </GlassCard>
          ))}
        </div>
      )}

      {loading && !data && <Spinner />}
      {data && LIVE_BUCKET_META.map(({ key, label, color }) => {
        const rows = data[key];
        if (!rows.length) return null;
        return (
          <div key={key} className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">{label}</span>
              <span className="text-[10px] text-white/20">({rows.length})</span>
            </div>
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Session ID","User","Game","Phase","Region","Queue","Started","Duration","Credits"].map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] text-white/20 font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={row._id} onClick={() => setSelectedSession(row)}
                        className={`border-b border-white/[0.03] hover:bg-teal-900/5 cursor-pointer transition-colors ${i%2?"bg-white/[0.01]":""}`}>
                        <td className="px-3 py-2 font-mono text-[10px]" style={{ color }}>{row._id}</td>
                        <td className="px-3 py-2 text-white/70">{row.user?.username}</td>
                        <td className="px-3 py-2 text-white/80 font-semibold">{row.game}</td>
                        <td className="px-3 py-2"><PhaseBadge phase={row.phase} /></td>
                        <td className="px-3 py-2 text-white/40 font-mono text-[10px]">{row.region}</td>
                        <td className="px-3 py-2 text-white/40 text-[10px]">{row.queueType}</td>
                        <td className="px-3 py-2 text-white/40 whitespace-nowrap">{fmtDateTime(row.startedAt)}</td>
                        <td className="px-3 py-2 text-white/60 font-mono">{fmtDuration(row.duration)}</td>
                        <td className="px-3 py-2 text-white/60 font-mono">{row.credits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        );
      })}

      {selectedSession && (
        <SessionDrawer sessionId={selectedSession._id} sessionPreview={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}

// ─── Session Outcomes ─────────────────────────────────────────────────────────

function SessionOutcomes() {
  const { dr } = useDateRange();
  const params = drToParams(dr);
  const { data, loading, error, refresh } = usePoller<ExitReasonStat[]>(
    () => apiFetch("/sessions/exit-reasons", params), 30_000, [JSON.stringify(params)]
  );

  if (loading) return <Spinner />;
  if (error)   return <ErrorBanner message={error} onRetry={refresh} />;
  if (!data)   return null;

  const pieData = data.map((d) => ({ name: d.reason.replace(/_/g," "), value: d.count, color: EXIT_REASON_COLORS[d.reason] }));

  return (
    <div>
      <SectionHeader title="Session Outcome Analytics" sub="Exit reason distribution for selected period" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <GlassCard className="p-4 flex flex-col">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Distribution</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.9} />)}
              </Pie>
              <Tooltip content={<RigzerTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </GlassCard>
        <GlassCard className="p-4 col-span-2">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-3">Count by Reason</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.slice(0,8)} layout="vertical" barSize={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="reason" tick={{ fill:"rgba(255,255,255,0.4)",fontSize:10 }} axisLine={false} tickLine={false} width={120}
                tickFormatter={(v: string) => v.replace(/_/g," ")} />
              <Tooltip content={<RigzerTooltip />} />
              <Bar dataKey="count" name="Count" radius={[0,3,3,0]}>
                {data.slice(0,8).map((d, i) => <Cell key={i} fill={EXIT_REASON_COLORS[d.reason]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
      <GlassCard className="overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.06]">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Breakdown</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.05]">
                {["Exit Reason","Count","% of Total","WoW Trend"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] text-white/25 font-bold uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.reason} className={`border-b border-white/[0.04] ${i%2?"bg-white/[0.01]":""}`}>
                  <td className="px-4 py-2.5"><ExitReasonBadge reason={row.reason} /></td>
                  <td className="px-4 py-2.5 text-white/80 font-mono font-semibold">{row.count.toLocaleString()}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden" style={{ maxWidth:80 }}>
                        <div className="h-full rounded-full" style={{ width:`${Math.min(row.pct*2.2,100)}%`, backgroundColor:EXIT_REASON_COLORS[row.reason] }} />
                      </div>
                      <span className="text-white/50 font-mono">{row.pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5"><TrendBadge value={row.trend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Game Health ──────────────────────────────────────────────────────────────

function GameHealth() {
  const { dr } = useDateRange();
  const params = drToParams(dr);
  const { data: games, loading, error, refresh } = usePoller<GameHealthRecord[]>(
    () => apiFetch("/games/health", params), 30_000, [JSON.stringify(params)]
  );
  const [search, setSearch]         = useState("");
  const [healthFilter, setHFilter]  = useState("all");
  const [sortBy, setSortBy]         = useState<keyof GameHealthRecord>("healthScore");
  const [selectedGame, setSelectedGame] = useState<GameHealthRecord | null>(null);

  const filtered = useMemo(() => {
    if (!games) return [];
    let rows = [...games];
    if (search) rows = rows.filter((g) => g.gameName.toLowerCase().includes(search.toLowerCase()) || g.creator.toLowerCase().includes(search.toLowerCase()));
    if (healthFilter !== "all") rows = rows.filter((g) => g.healthStatus === healthFilter);
    rows.sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));
    return rows;
  }, [games, search, healthFilter, sortBy]);

  if (selectedGame) {
    return <GameInvestigation game={selectedGame} onBack={() => setSelectedGame(null)} />;
  }

  const healthyCount =
  games?.filter(g => g.healthStatus === "Healthy").length ?? 0;

const goodCount =
  games?.filter(g => g.healthStatus === "Good").length ?? 0;

const warningCount =
  games?.filter(g => g.healthStatus === "Warning").length ?? 0;

const criticalCount =
  games?.filter(g => g.healthStatus === "Critical").length ?? 0;

  return (
    <div>
      <SectionHeader title="Game Health Dashboard" sub="Session quality and failure rates per game" />
      {error && <ErrorBanner message={error} onRetry={refresh} />}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[200px]"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search game or creator…" /></div>
        <SelectFilter value={healthFilter} onChange={(e) => setHFilter(e.target.value)}
          options={[{value:"all",label:"All Health"},{value:"Healthy",label:"Healthy"},{value:"Good",label:"Good"},{value:"Warning",label:"Warning"},{value:"Critical",label:"Critical"}]} />
        <SelectFilter value={String(sortBy)} onChange={(e) => setSortBy(e.target.value as keyof GameHealthRecord)}
          options={[
            { value:"healthScore", label:"Health Score ↓" },
            { value:"activeSessions", label:"Active ↓" },
            { value:"totalSessions", label:"Total ↓" },
            { value:"failureRate", label:"Failure Rate ↓" },
            { value:"creditsBurned", label:"Credits ↓" },
            ]} />
      </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
    <KpiCard
        label="Healthy"
        value={String(healthyCount)}
        accent="green"
    />

    <KpiCard
        label="Good"
        value={String(goodCount)}
        accent="teal"
    />

    <KpiCard
        label="Warning"
        value={String(warningCount)}
        accent="amber"
    />

    <KpiCard
        label="Critical"
        value={String(criticalCount)}
        accent="red"
    />
    </div>
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Game","Creator","Active","Total","Players","Failure Rate","Crash Rate","Credits","Health Score","Session Trend","Health"].map((h) => (
                  <th key={h} className="px-3.5 py-2.5 text-left text-[10px] text-white/25 font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:6}).map((_,i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {Array.from({length:10}).map((_,j) => (
                    <td key={j} className="px-3.5 py-2.5"><div className="h-3 rounded bg-white/[0.06] animate-pulse" style={{width:`${40+(j*11)%50}%`}} /></td>
                  ))}
                </tr>
              )) : filtered.map((g, i) => (
                <tr key={g._id} onClick={() => setSelectedGame(g)}
                  className={`border-b border-white/[0.04] hover:bg-teal-900/5 cursor-pointer transition-colors ${i%2?"bg-white/[0.01]":""}`}>
                  <td className="px-3.5 py-2.5 font-semibold text-white/90">{g.gameName}</td>
                  <td className="px-3.5 py-2.5 text-white/40 font-mono text-[10px]">{g.creator}</td>
                  <td className="px-3.5 py-2.5 text-teal-400 font-bold font-mono">{fmtNum(g.activeSessions)}</td>
                  <td className="px-3.5 py-2.5 text-white/60 font-mono">{fmtNum(g.totalSessions)}</td>
                  <td className="px-3.5 py-2.5 text-white/50 font-mono">{fmtNum(g.uniquePlayers)}</td>
                  <td className="px-3.5 py-2.5"><span className={`font-bold font-mono ${g.failureRate>5?"text-red-400":g.failureRate>2?"text-amber-400":"text-green-400"}`}>{g.failureRate}%</span></td>
                  <td className="px-3.5 py-2.5"><span className={`font-bold font-mono ${g.crashRate>4?"text-red-400":g.crashRate>1?"text-amber-400":"text-green-400"}`}>{g.crashRate}%</span></td>
                  <td className="px-3.5 py-2.5 text-white/60 font-mono">{fmtNum(g.creditsBurned)}</td>
                  <td className="px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                    <span
                    className={`font-bold font-mono ${
                        g.healthScore >= 90
                        ? "text-green-400"
                        : g.healthScore >= 75
                        ? "text-emerald-400"
                        : g.healthScore >= 60
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                    >
                    {g.healthScore}
                    </span>

                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                        className={`h-full ${
                        g.healthScore >= 90
                            ? "bg-green-500"
                            : g.healthScore >= 75
                            ? "bg-emerald-500"
                            : g.healthScore >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                        style={{
                        width: `${g.healthScore}%`,
                        }}
                    />
                    </div>
                </div>
                </td>
                  <td className="px-3.5 py-2.5"><TrendBadge value={g.sessionTrend} /></td>
                <td className="px-3.5 py-2.5">
                <HealthBadge score={g.healthStatus} />
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && <div className="px-4 py-2.5 border-t border-white/[0.05] text-[10px] text-white/25">{filtered.length} games</div>}
      </GlassCard>
    </div>
  );
}

function GameInvestigation({ game, onBack }: { game: GameHealthRecord; onBack: () => void }) {
  const { dr } = useDateRange();
  const params = drToParams(dr);
  const [page, setPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<SessionListItem | null>(null);

  const { data, loading } = usePoller<{ summary: unknown; sessions: PaginatedResponse<SessionListItem> }>(
    () => apiFetch(`/games/${game._id}/sessions`, { ...params, page }),
    0,
    [game._id, JSON.stringify(params), page]
  );

  const summary = data?.summary as Record<string,number> | undefined;

  return (
    <div>
      <SectionHeader
        title={game.gameName}
        sub={`Game Investigation · ${game.creator}`}
        actions={<Btn onClick={onBack} variant="ghost">← Back</Btn>}
      />
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-5">
          {([
            ["Total Sessions",  fmtNum(summary.totalSessions),  "default"],
            ["Unique Players",  fmtNum(summary.uniquePlayers),  "teal"],
            ["Total Credits",   fmtNum(summary.totalCredits),   "amber"],
            ["Total Play Time", fmtDuration(summary.totalPlayTime), "blue"],
            ["Failure Rate",    fmtPct(summary.failureRate),    summary.failureRate>5?"red":"green"],
            ["Crash Rate",      fmtPct(summary.crashRate),      summary.crashRate>4?"red":"green"],
            ["Disconnect Rate", fmtPct(summary.disconnectRate), "default"],
          ] as [string,string,string][]).map(([l,v,a]) =>
            <KpiCard key={l} label={l} value={v} accent={a as never} />
          )}
        </div>
      )}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["User","Status","Duration","Credits","Exit Reason","Started","Ended"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] text-white/25 font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:10}).map((_,i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {Array.from({length:7}).map((_,j) => (
                    <td key={j} className="px-3 py-2.5"><div className="h-3 rounded bg-white/[0.06] animate-pulse" style={{width:`${40+(j*9)%55}%`}} /></td>
                  ))}
                </tr>
              )) : data?.sessions.rows.map((row, i) => (
                <tr key={row._id} onClick={() => setSelectedSession(row)}
                  className={`border-b border-white/[0.04] hover:bg-teal-900/5 cursor-pointer transition-colors ${i%2?"bg-white/[0.01]":""}`}>
                  <td className="px-3 py-2.5 text-white/70">{row.user?.username}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                  <td className="px-3 py-2.5 text-white/60 font-mono">{fmtDuration(row.duration)}</td>
                  <td className="px-3 py-2.5 text-white/60 font-mono">{row.credits}</td>
                  <td className="px-3 py-2.5"><ExitReasonBadge reason={row.exitReason} /></td>
                  <td className="px-3 py-2.5 text-white/40 whitespace-nowrap">{fmtDateTime(row.startedAt)}</td>
                  <td className="px-3 py-2.5 text-white/40 whitespace-nowrap">{fmtDateTime(row.endedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data?.sessions && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-white/25">Page {page} of {data.sessions.totalPages} · {fmtNum(data.sessions.total)} sessions</span>
            <Pagination page={page} totalPages={data.sessions.totalPages} onPage={setPage} />
          </div>
        )}
      </GlassCard>
      {selectedSession && (
        <SessionDrawer sessionId={selectedSession._id} sessionPreview={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}

// ─── Session Explorer ─────────────────────────────────────────────────────────

function SessionExplorer() {
  const { dr } = useDateRange();
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState("");
  const [querySearch, setQS]        = useState("");
  const [statusFilter, setSF]       = useState("all");
  const [exitFilter, setEF]         = useState("all");
  const [queueFilter, setQF]        = useState("all");
  const [regionFilter, setRF]       = useState("");
  const [selectedSession, setSelectedSession] = useState<SessionListItem | null>(null);
  const PAGE_SIZE = 20;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setQS(search); setPage(1); }, 400);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [search]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [JSON.stringify(dr), statusFilter, exitFilter, queueFilter, regionFilter]);

  const params = {
    page, pageSize: PAGE_SIZE,
    search: querySearch || undefined,
    status:    statusFilter !== "all" ? statusFilter : undefined,
    exitReason:exitFilter   !== "all" ? exitFilter   : undefined,
    queueType: queueFilter  !== "all" ? queueFilter  : undefined,
    region:    regionFilter || undefined,
    ...drToParams(dr),
  };

  const { data, loading, error, refresh } = usePoller<PaginatedResponse<SessionListItem>>(
    () => apiFetch("/sessions", params), 0, [JSON.stringify(params)]
  );

  const exportCSV = () => {
    if (!data) return;
    exportToCSV(`sessions_${dr.range ?? "custom"}_p${page}.csv`,
      ["Session ID","User","Game","Status","Phase","Queue","Region","Started","Ended","Duration(ms)","Play Time(ms)","Credits","Exit Reason","Instance ID"],
      data.rows.map((r) => [r._id,r.user?.username,r.game,r.status,r.phase,r.queueType,r.region,r.startedAt,r.endedAt,r.duration,r.totalPlayTime,r.credits,r.exitReason,r.instanceId])
    );
  };

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 1;

  return (
    <div>
      <SectionHeader title="Session Explorer"
        sub={data ? `${fmtNum(data.total)} sessions for selected range` : "Loading…"}
        actions={
          <div className="flex gap-2">
            <Btn onClick={refresh} variant="ghost">↻</Btn>
            <Btn onClick={exportCSV} variant="teal" disabled={!data}>↓ CSV</Btn>
          </div>
        } />
      {error && <ErrorBanner message={error} onRetry={refresh} />}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex-1 min-w-[200px]"><SearchInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Session ID, user, game, instance…" /></div>
        <SelectFilter value={statusFilter} onChange={(e) => { setSF(e.target.value); setPage(1); }}
          options={[{value:"all",label:"All Status"},...["waiting","starting","running","ended","failed"].map((s) => ({value:s,label:s}))]} />
        <SelectFilter value={exitFilter} onChange={(e) => { setEF(e.target.value); setPage(1); }}
          options={[{value:"all",label:"All Exit Reasons"},...["user_exit","timeout","disconnect","crash","credits_exhausted","user_cancelled","user_abandoned","countdown_expired"].map((r) => ({value:r,label:r.replace(/_/g," ")}))]} />
        <SelectFilter value={queueFilter} onChange={(e) => { setQF(e.target.value); setPage(1); }}
          options={[{value:"all",label:"Queue Type"},{value:"direct",label:"Direct"},{value:"queued",label:"Queued"}]} />
        <input value={regionFilter} onChange={(e) => { setRF(e.target.value); setPage(1); }} placeholder="Region…"
          className="bg-[#161616] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-[11px] text-white/70 outline-none focus:border-teal-600/50 w-28" />
      </div>
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Session ID","User","Game","Status","Phase","Queue","Region","Started","Duration","Credits","Exit Reason"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] text-white/25 font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:PAGE_SIZE}).map((_,i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {Array.from({length:11}).map((_,j) => <td key={j} className="px-3 py-2.5"><div className="h-3 rounded bg-white/[0.06] animate-pulse" style={{width:`${35+(j*9)%55}%`}} /></td>)}
                </tr>
              )) : data?.rows.map((row, i) => (
                <tr key={row._id} onClick={() => setSelectedSession(row)}
                  className={`border-b border-white/[0.04] hover:bg-teal-900/5 cursor-pointer transition-colors ${i%2?"bg-white/[0.01]":""}`}>
                  <td className="px-3 py-2.5 font-mono text-teal-500 text-[10px]">{row._id}</td>
                  <td className="px-3 py-2.5 text-white/70">{row.user?.username}</td>
                  <td className="px-3 py-2.5 text-white/80 font-semibold">{row.game}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={row.status} /></td>
                  <td className="px-3 py-2.5"><PhaseBadge phase={row.phase} /></td>
                  <td className="px-3 py-2.5 text-white/40 text-[10px]">{row.queueType}</td>
                  <td className="px-3 py-2.5 text-white/40 font-mono text-[10px]">{row.region}</td>
                  <td className="px-3 py-2.5 text-white/40 whitespace-nowrap">{fmtDateTime(row.startedAt)}</td>
                  <td className="px-3 py-2.5 text-white/60 font-mono">{fmtDuration(row.duration)}</td>
                  <td className="px-3 py-2.5 text-white/60 font-mono">{row.credits}</td>
                  <td className="px-3 py-2.5"><ExitReasonBadge reason={row.exitReason} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
          <span className="text-[10px] text-white/25">Page {page} of {totalPages.toLocaleString()} · {data ? fmtNum(data.total) : "—"} sessions</span>
          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </div>
      </GlassCard>
      {selectedSession && (
        <SessionDrawer sessionId={selectedSession._id} sessionPreview={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}

// ─── User Investigation ───────────────────────────────────────────────────────

function UserInvestigation() {
  const { dr } = useDateRange();
  const [query, setQuery]       = useState("");
  const [userData, setUserData] = useState<UserSessionSummary | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionListItem | null>(null);

  const investigate = async () => {
    if (!query.trim()) return;
    setLoading(true); setError(null);
    try {
      const result = await apiFetch<UserSessionSummary>(`/users/${encodeURIComponent(query.trim())}/summary`, drToParams(dr));
      setUserData(result);
    } catch (e) {
      setError(axios.isAxiosError(e) ? (e.response?.data?.message ?? e.message) : "User not found");
      setUserData(null);
    } finally { setLoading(false); }
  };

  const s = userData?.summary;

  const exportCSV = () => {
    if (!userData) return;
    exportToCSV(`user_${userData.user.username}_sessions.csv`,
      ["Session ID","Game","Status","Started","Duration(ms)","Credits","Exit Reason"],
      userData.recentSessions.map((r) => [r._id,r.game,r.status,r.startedAt,r.duration,r.credits,r.exitReason])
    );
  };

  return (
    <div>
      <SectionHeader title="User Investigation" sub="Deep-dive session history, credit usage and failure patterns" />
      <GlassCard className="p-4 mb-5">
        <div className="flex gap-2">
          <div className="flex-1"><SearchInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Enter user ID or username…" /></div>
          <Btn onClick={investigate} variant="teal" size="md">Investigate</Btn>
        </div>
      </GlassCard>
      {error   && <ErrorBanner message={error} />}
      {loading && <Spinner />}
      {userData && !loading && (
        <div className="flex flex-col gap-4">
          <GlassCard className="p-4" accent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-teal-900/40 border border-teal-600/30 text-[15px] font-bold text-teal-400">
                  {userData.user.username.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-[14px] text-white/90">{userData.user.username}</div>
                  <div className="text-[11px] text-white/40">{userData.user.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {userData.mostActiveRegion && (
                  <div className="text-[10px] text-white/30">Most active: <span className="text-teal-400 font-semibold">{userData.mostActiveRegion}</span></div>
                )}
                <Btn onClick={exportCSV} variant="ghost" size="sm">↓ CSV</Btn>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {([
                ["Sessions",     fmtNum(s?.totalSessions),           "default"],
                ["Play Time",    fmtDuration(s?.totalPlayTime),       "default"],
                ["Credits",      fmtNum(s?.creditsConsumed),          "teal"],
                ["Avg Duration", fmtDuration(s?.avgSessionDuration),  "default"],
                ["Failures",     fmtNum(s?.failures),                 "red"],
                ["Disconnects",  fmtNum(s?.disconnects),              "amber"],
                ["Success Rate", fmtPct(s?.successRate ?? 0),         s?.successRate ?? 0 > 90 ? "green" : "amber"],
                ["Failure Rate", fmtPct(s?.failureRate ?? 0),         s?.failureRate ?? 0 > 5 ? "red" : "green"],
              ] as [string,string,string][]).map(([k,v,a]) => (
                <div key={k} className="bg-white/[0.04] rounded-xl p-2.5 text-center">
                  <div className="text-[9px] text-white/25 uppercase tracking-widest mb-1">{k}</div>
                  <div className={`text-[13px] font-bold font-mono ${a==="red"?"text-red-400":a==="green"?"text-green-400":a==="teal"?"text-teal-400":a==="amber"?"text-amber-400":"text-white/90"}`}>{v}</div>
                </div>
              ))}
            </div>
            {userData.favoriteGames?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="text-[10px] text-white/25 uppercase tracking-widest mb-2">Favorite Games</div>
                <div className="flex flex-wrap gap-2">
                  {userData.favoriteGames.map((g) => (
                    <div key={g._id} className="flex items-center gap-1.5 bg-white/[0.04] rounded-lg px-2.5 py-1 text-[11px]">
                      <span className="text-white/70">{g.gameName}</span>
                      <span className="text-teal-400 font-mono font-semibold">{g.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Session Timeline</div>
              <span className="text-[10px] text-white/25">{userData.recentSessions.length} sessions shown</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["ID","Game","Status","Started","Duration","Credits","Exit"].map((h) => (
                      <th key={h} className="px-3.5 py-2.5 text-left text-[10px] text-white/25 font-bold uppercase tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {userData.recentSessions.map((row, i) => (
                    <tr key={row._id} onClick={() => setSelectedSession(row)}
                      className={`border-b border-white/[0.04] hover:bg-teal-900/5 cursor-pointer transition-colors ${i%2?"bg-white/[0.01]":""}`}>
                      <td className="px-3.5 py-2.5 font-mono text-teal-500 text-[10px]">{row._id}</td>
                      <td className="px-3.5 py-2.5 text-white/80">{row.game}</td>
                      <td className="px-3.5 py-2.5"><StatusBadge status={row.status} /></td>
                      <td className="px-3.5 py-2.5 text-white/40">{fmtDateTime(row.startedAt)}</td>
                      <td className="px-3.5 py-2.5 text-white/60 font-mono">{fmtDuration(row.duration)}</td>
                      <td className="px-3.5 py-2.5 text-white/60 font-mono">{row.credits}</td>
                      <td className="px-3.5 py-2.5"><ExitReasonBadge reason={row.exitReason} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
      {selectedSession && (
        <SessionDrawer sessionId={selectedSession._id} sessionPreview={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}

// ─── Failure Investigation ────────────────────────────────────────────────────

function FailureInvestigation() {
  const { dr } = useDateRange();
  const [exitFilter, setEF]   = useState("all");
  const [regionFilter, setRF] = useState("");
  const [page, setPage]       = useState(1);
  const [selectedSession, setSelectedSession] = useState<SessionListItem | null>(null);

  const params = {
    ...drToParams(dr),
    exitReason: exitFilter !== "all" ? exitFilter : undefined,
    region:     regionFilter || undefined,
    page,
  };

  const { data, loading, error, refresh } = usePoller<FailureData>(
    () => apiFetch("/failures", params as Record<string,string|number|undefined>),
    0,
    [JSON.stringify(params)]
  );

  const exportCSV = () => {
    if (!data) return;
    exportToCSV(`failures_${dr.range ?? "custom"}.csv`,
      ["Session ID","User","Game","Exit Reason","Error","Credits","Region","Created At"],
      data.sessions.rows.map((r) => [r._id,r.user?.username,r.game,r.exitReason,(r as unknown as {error:string}).error,r.credits,r.region,r.startedAt])
    );
  };

  const trend = data?.trend ?? [];
  const sessions = data?.sessions;

  return (
    <div>
      <SectionHeader title="Failure Investigation" sub="Operational debugging — failure trends and session details"
        actions={
          <div className="flex gap-2">
            <Btn onClick={refresh} variant="ghost">↻</Btn>
            <Btn onClick={exportCSV} variant="danger" disabled={!data}>↓ CSV</Btn>
          </div>
        } />
      {error && <ErrorBanner message={error} onRetry={refresh} />}

      <div className="flex flex-wrap gap-2 mb-4">
        <SelectFilter value={exitFilter} onChange={(e) => { setEF(e.target.value); setPage(1); }}
          options={[{value:"all",label:"All Exit Reasons"},...["crash","disconnect","timeout","user_abandoned","countdown_expired","credits_exhausted"].map((r) => ({value:r,label:r.replace(/_/g," ")}))]} />
        <input value={regionFilter} onChange={(e) => { setRF(e.target.value); setPage(1); }} placeholder="Region filter…"
          className="bg-[#161616] border border-white/[0.08] rounded-xl px-2.5 py-1.5 text-[11px] text-white/70 outline-none focus:border-teal-600/50 w-36" />
      </div>

      {trend.length > 0 && (
        <GlassCard className="p-4 mb-5">
          <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Failure Trends by Type</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<RigzerTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:"10px", color:"rgba(255,255,255,0.4)" }} />
              <Area type="monotone" dataKey="crashes"          name="Crashes"          stroke="#dc2626" fill="none" strokeWidth={1.5} />
              <Area type="monotone" dataKey="disconnects"      name="Disconnects"      stroke="#ef4444" fill="none" strokeWidth={1.5} />
              <Area type="monotone" dataKey="timeouts"         name="Timeouts"         stroke="#f4a261" fill="none" strokeWidth={1.5} />
              <Area type="monotone" dataKey="abandoned"        name="Abandoned"        stroke="#6b7280" fill="none" strokeWidth={1.5} />
              <Area type="monotone" dataKey="countdownExpired" name="Countdown Expiry" stroke="#f59e0b" fill="none" strokeWidth={1.5} />
              <Area type="monotone" dataKey="creditExhausted"  name="Credits Exhausted"stroke="#b45309" fill="none" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Session ID","User","Game","Exit Reason","Error Message","Credits","Region","Created At"].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[10px] text-white/25 font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:10}).map((_,i) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  {Array.from({length:8}).map((_,j) => <td key={j} className="px-3 py-2.5"><div className="h-3 rounded bg-white/[0.06] animate-pulse" style={{width:`${35+(j*9)%55}%`}} /></td>)}
                </tr>
              )) : sessions?.rows.map((row, i) => (
                <tr key={row._id} onClick={() => setSelectedSession(row)}
                  className={`border-b border-white/[0.04] hover:bg-red-900/5 cursor-pointer transition-colors ${i%2?"bg-white/[0.01]":""}`}>
                  <td className="px-3 py-2.5 font-mono text-red-500 text-[10px]">{row._id}</td>
                  <td className="px-3 py-2.5 text-white/70">{row.user?.username}</td>
                  <td className="px-3 py-2.5 text-white/80">{row.game}</td>
                  <td className="px-3 py-2.5"><ExitReasonBadge reason={row.exitReason} /></td>
                  <td className="px-3 py-2.5 text-red-400/60 font-mono text-[10px] max-w-[200px] truncate">{(row as unknown as {error:string}).error || "—"}</td>
                  <td className="px-3 py-2.5 text-white/60 font-mono">{row.credits}</td>
                  <td className="px-3 py-2.5 text-white/40 font-mono text-[10px]">{row.region}</td>
                  <td className="px-3 py-2.5 text-white/40 whitespace-nowrap">{fmtDateTime(row.startedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sessions && (
          <div className="px-4 py-3 border-t border-white/[0.06] flex items-center justify-between">
            <span className="text-[10px] text-white/25">Page {page} of {sessions.totalPages} · {fmtNum(sessions.total)} failures</span>
            <Pagination page={page} totalPages={sessions.totalPages} onPage={setPage} />
          </div>
        )}
      </GlassCard>
      {selectedSession && (
        <SessionDrawer sessionId={selectedSession._id} sessionPreview={selectedSession} onClose={() => setSelectedSession(null)} />
      )}
    </div>
  );
}

// ─── Region Analytics ─────────────────────────────────────────────────────────

function RegionAnalytics() {
  const { dr } = useDateRange();
  const params = drToParams(dr);
  const { data, loading, error, refresh } = usePoller<RegionStat[]>(
    () => apiFetch("/regions", params), 30_000, [JSON.stringify(params)]
  );

  if (loading && !data) return <Spinner />;
  if (error)   return <ErrorBanner message={error} onRetry={refresh} />;

  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + r.sessions, 0);

  return (
    <div>
      <SectionHeader title="Region Analytics" sub="Session distribution and quality by region" />

      {rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
          <GlassCard className="p-4">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Sessions by Region</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rows} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="region" tick={{ fill:"rgba(255,255,255,0.4)",fontSize:10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<RigzerTooltip />} />
                <Bar dataKey="sessions" name="Sessions" fill="#3D7A6E" radius={[0,3,3,0]} />
                <Bar dataKey="failures" name="Failures" fill="#ef4444" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Failure Rate by Region</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rows} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} unit="%" />
                <YAxis type="category" dataKey="region" tick={{ fill:"rgba(255,255,255,0.4)",fontSize:10 }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<RigzerTooltip />} />
                <Bar dataKey="failureRate" name="Failure %" fill="#f4a261" radius={[0,3,3,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      )}

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/[0.07]">
                {["Region","Sessions","% Share","Failures","Failure Rate","Avg Duration","Play Time","Credits","Players","Games","Trend"].map((h) => (
                  <th key={h} className="px-3.5 py-2.5 text-left text-[10px] text-white/25 font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.region} className={`border-b border-white/[0.04] ${i%2?"bg-white/[0.01]":""}`}>
                  <td className="px-3.5 py-2.5 font-semibold text-white/90 font-mono">{r.region}</td>
                  <td className="px-3.5 py-2.5 text-teal-400 font-bold font-mono">{fmtNum(r.sessions)}</td>
                  <td className="px-3.5 py-2.5 text-white/50 font-mono">{total > 0 ? fmtPct((r.sessions/total)*100) : "—"}</td>
                  <td className="px-3.5 py-2.5 text-white/60 font-mono">{fmtNum(r.failures)}</td>
                  <td className="px-3.5 py-2.5"><span className={`font-bold font-mono ${r.failureRate>5?"text-red-400":r.failureRate>2?"text-amber-400":"text-green-400"}`}>{r.failureRate}%</span></td>
                  <td className="px-3.5 py-2.5 text-white/50">{fmtDuration(r.avgDuration)}</td>
                  <td className="px-3.5 py-2.5 text-white/50">{fmtDuration(r.totalPlayTime)}</td>
                  <td className="px-3.5 py-2.5 text-white/60 font-mono">{fmtNum(r.creditsBurned)}</td>
                  <td className="px-3.5 py-2.5 text-white/50 font-mono">{fmtNum(r.activePlayers)}</td>
                  <td className="px-3.5 py-2.5 text-white/50 font-mono">{fmtNum(r.activeGames)}</td>
                  <td className="px-3.5 py-2.5"><TrendBadge value={r.sessionTrend} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-white/[0.05] text-[10px] text-white/25">{rows.length} regions</div>
      </GlassCard>
    </div>
  );
}

// ─── Queue Analytics ──────────────────────────────────────────────────────────

function QueueAnalytics() {
  const { dr } = useDateRange();
  const params = drToParams(dr);
  const { data, loading, error, refresh } = usePoller<QueueStats>(
    () => apiFetch("/queue", params), 30_000, [JSON.stringify(params)]
  );

  if (loading && !data) return <Spinner />;
  if (error)   return <ErrorBanner message={error} onRetry={refresh} />;
  if (!data)   return null;

  return (
    <div>
      <SectionHeader title="Queue Analytics" sub="Queued session metrics and conversion rates" />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {([
          ["Queue Depth",    fmtNum(data.currentLength),  "amber"],
          ["Total Queued",   fmtNum(data.totalQueued),    "default"],
          ["Success Rate",   fmtPct(data.successRate),    data.successRate>90?"green":"amber"],
          ["Abandon Rate",   fmtPct(data.abandonmentRate),data.abandonmentRate>10?"red":"default"],
          ["Avg Wait Time",  fmtDuration(data.avgWaitTime),"default"],
          ["Conversion Rate",fmtPct(data.conversionRate), "teal"],
        ] as [string,string,string][]).map(([l,v,a]) =>
          <KpiCard key={l} label={l} value={v} accent={a as never} />
        )}
      </div>

      {data.trend.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassCard className="p-4">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Queue Volume</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} />
                <Tooltip content={<RigzerTooltip />} />
                <Area type="monotone" dataKey="queued"    name="Queued"    stroke="#5bbfaa" fill="rgba(91,191,170,0.1)" strokeWidth={2} />
                <Area type="monotone" dataKey="converted" name="Converted" stroke="#52b788" fill="none" strokeWidth={1.5} />
                <Area type="monotone" dataKey="abandoned" name="Abandoned" stroke="#ef4444" fill="none" strokeWidth={1.5} strokeDasharray="4 2" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
          <GlassCard className="p-4">
            <div className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-4">Average Wait Time</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill:"rgba(255,255,255,0.3)",fontSize:10 }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => fmtDuration(v)} />
                <Tooltip content={<RigzerTooltip />} />
                <Line type="monotone" dataKey="avgWait" name="Avg Wait" stroke="#f4a261" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// ─── Root Dashboard ───────────────────────────────────────────────────────────

export default function SessionMonitoringDashboard() {
  const [activeSection, setActiveSection] = useState<NavId>("overview");
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [clock, setClock]                 = useState(() => new Date().toLocaleTimeString());
  const [dr, setDr]                       = useState<DateRange>({ range: "30d" });

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  const isLiveSection = activeSection === "live";

  const renderSection = () => {
    switch (activeSection) {
      case "overview":  return <HealthOverview />;
      case "live":      return <LiveMonitor />;
      case "outcomes":  return <SessionOutcomes />;
      case "games":     return <GameHealth />;
      case "explorer":  return <SessionExplorer />;
      case "users":     return <UserInvestigation />;
      case "failures":  return <FailureInvestigation />;
      case "regions":   return <RegionAnalytics />;
      case "queue":     return <QueueAnalytics />;
      default:          return <HealthOverview />;
    }
  };

  return (
    <DateRangeCtx.Provider value={{ dr, setDr }}>
      <div className="min-h-screen flex" style={{ backgroundColor:"#0d0d0d", color:"rgba(255,255,255,0.9)", fontFamily:"'Inter',system-ui,sans-serif" }}>

        {/* Sidebar */}
        <div className={`shrink-0 flex flex-col transition-all duration-300 ${sidebarOpen?"w-[220px]":"w-[60px]"}`}
          style={{ backgroundColor:"#0e0e0e", borderRight:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="px-4 py-5 border-b border-white/[0.05] flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-sm bg-teal-600" />
                <div>
                  <div className="text-[13px] font-extrabold text-white/90 leading-none">RIGZER</div>
                  <div className="text-[9px] text-white/30 uppercase tracking-widest">Admin</div>
                </div>
              </div>
            )}
            <button onClick={() => setSidebarOpen((p) => !p)}
              className="text-white/25 hover:text-white/60 transition-colors bg-transparent border-none cursor-pointer text-sm ml-auto">
              {sidebarOpen ? "←" : "→"}
            </button>
          </div>

          <nav className="flex-1 py-3">
            {NAV_ITEMS.map((item) => {
              const active = activeSection === item.id;
              return (
                <button key={item.id} onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-all duration-150 cursor-pointer border-none relative ${active?"bg-teal-900/20 text-teal-400":"text-white/30 hover:text-white/60 hover:bg-white/[0.03] bg-transparent"}`}>
                  {active && <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-full bg-teal-600" />}
                  <span className="text-sm shrink-0">{item.icon}</span>
                  {sidebarOpen && <span className="text-[12px] font-semibold whitespace-nowrap">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {sidebarOpen && (
            <div className="px-4 py-3 border-t border-white/[0.05]">
              <div className="text-[10px] text-white/20 uppercase tracking-widest">Session Monitoring</div>
              <div className="text-[9px] text-white/15 mt-0.5">/admin/session-monitoring</div>
            </div>
          )}
        </div>

        {/* Main */}
        <div className="flex-1 overflow-auto">
          <div className="sticky top-0 z-10 px-6 py-3 flex items-center justify-between gap-4"
            style={{ backgroundColor:"rgba(13,13,13,0.9)", backdropFilter:"blur(12px)", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <div className="text-[13px] font-semibold text-white/60 whitespace-nowrap">
              {NAV_ITEMS.find((n) => n.id === activeSection)?.label}
            </div>
            <div className="flex items-center gap-3">
              {!isLiveSection && <DateRangePicker />}
              {isLiveSection && (
                <div className="flex items-center gap-2 text-[11px] text-white/30 bg-white/[0.04] rounded-xl px-3 py-1.5 border border-white/[0.08]">
                  <LiveDot color="#52b788" />
                  <span>Real-time only</span>
                </div>
              )}
              <div className="text-[10px] text-white/20 font-mono">{clock}</div>
            </div>
          </div>

          <div className="p-6 max-w-[1400px]">
            {renderSection()}
          </div>
        </div>
      </div>
    </DateRangeCtx.Provider>
  );
}