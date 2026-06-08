import { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { Play, Gamepad2, Sparkles, Loader2, AlertCircle, Users } from 'lucide-react';

// ─────────────────────────────────────────────────────────────
//  DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const T = {
  bg:             "#0d0d0d",
  bgDeep:         "#080808",
  surface:        "rgba(255,255,255,0.04)",
  surfaceHover:   "rgba(255,255,255,0.07)",
  border:         "rgba(255,255,255,0.08)",
  borderMid:      "rgba(255,255,255,0.13)",
  teal:           "#3D7A6E",
  tealLight:      "#5bbfaa",
  tealDim:        "rgba(61,122,110,0.18)",
  tealBorder:     "rgba(61,122,110,0.38)",
  textPrimary:    "#FFFFFF",
  textSecondary:  "#8a9a97",
  textTertiary:   "rgba(255,255,255,0.28)",
  success:        "#5bbfaa",
  warning:        "#c9a84c",
  negative:       "#c96060",
} as const;

// ─────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────
function safeDiv(a: number, b: number, fallback = 0): number {
  if (!b || !isFinite(b)) return fallback;
  const r = a / b;
  return isFinite(r) ? r : fallback;
}
function fmt(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(Math.round(n));
}
function fmtMs(ms: number): string {
  if (!isFinite(ms) || isNaN(ms) || ms <= 0) return "0s";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), rs = s % 60;
  if (m < 60) return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
  const h = Math.floor(m / 60), rm = m % 60;
  return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
}
function pct(n: number): string {
  if (!isFinite(n) || isNaN(n)) return "0%";
  return Math.round(n * 100) + "%";
}

// ─────────────────────────────────────────────────────────────
//  TYPES
// ─────────────────────────────────────────────────────────────
interface AnalyticsPeriod {
  views: number;
  uniqueViews: number;
  watchTimeMs: number;
  likes: number;
  comments: number;
  demoConsumptions: number;
  sessions: number;
  sessionPlayTimeMs: number;
  uniquePlayers: number;
}
interface MultiRangeChart {
  "7d": number[];
  "30d": number[];
  "90d": number[];
}
interface LifetimeBlock {
  views: number;
  uniqueViews: number;
  watchTimeMs: number;
  avgWatchTimeMs: number;
  likes: number;
  comments: number;
  engagementRate: number;
  demoConsumptions?: number;
  demoConversionRate?: number;
  sessions?: number;
  sessionPlayTimeMs?: number;
  avgSessionDurationMs?: number;
  avgPlayTimePerUserMs?: number;
  uniquePlayers?: number;
  // repeatPlayers?: number;
  // retentionRate?: number;
  vertices?: number;
  triangles?: number;
  developerCreditsBurned?: number;
  playerConversionRate?: number;
}
interface CreatorAsset {
  _id: string;
  type: "game" | "ad" | "3d_ad";
  displayName: string;
  today: AnalyticsPeriod;
  last7Days: AnalyticsPeriod;
  last30Days: AnalyticsPeriod;
  last90Days: AnalyticsPeriod;
  charts: {
    views: MultiRangeChart;
    uniqueViews: MultiRangeChart;
    watchTime: MultiRangeChart;
    likes: MultiRangeChart;
    comments: MultiRangeChart;
    demoConsumptions: MultiRangeChart;
    sessions: MultiRangeChart;
    playTime: MultiRangeChart;
    conversionRate: MultiRangeChart;
  };
  growthIndicators: {
    weekOverWeekGrowth: number;
    monthOverMonthGrowth: number;
    trend: "up" | "down" | "stable";
  };
  lifetime: LifetimeBlock;
  totalViews: number;
  uniqueViews: number;
  likes: number;
  comments: number;
  demoConsumption?: number;
  conversionRate?: number;
  totalSessions?: number;
  totalSessionTime?: number;
  developerCreditsBurned?: number;
}
interface AnalyticsPortfolio {
  totalViews: number;
  totalUniqueViews: number;
  totalLikes: number;
  totalComments: number;
  totalGames: number;
  totalAds: number;
  total3DAds: number;
  totalDemoConsumptions: number;
  totalSessions: number;
  totalPlayTime: number;
  lifetime: {
    totalViews: number;
    totalUniqueViews: number;
    totalLikes: number;
    totalComments: number;
    totalWatchTimeMs: number;
    totalDemoConsumptions: number;
    totalSessions: number;
    totalPlayTimeMs: number;
    avgWatchTimeMs: number;
    avgSessionDurationMs: number;
  };
  today: AnalyticsPeriod;
  last7Days: AnalyticsPeriod;
  last30Days: AnalyticsPeriod;
  last90Days: AnalyticsPeriod;
}

// ─────────────────────────────────────────────────────────────
//  ASSET CONFIG
// ─────────────────────────────────────────────────────────────
interface AssetCfg { icon: string; color: string; dim: string; border: string; }

const ASSET_CFG: Record<CreatorAsset["type"], AssetCfg> = {
  game:   { icon: "ti-device-gamepad-2", color: "#3D7A6E", dim: "rgba(61,122,110,0.18)",  border: "rgba(61,122,110,0.35)"  },
  ad:     { icon: "ti-speakerphone",     color: "#7a6e3d", dim: "rgba(122,110,61,0.18)",  border: "rgba(122,110,61,0.35)"  },
  "3d_ad":{ icon: "ti-box",             color: "#3d5f7a", dim: "rgba(61,95,122,0.18)",   border: "rgba(61,95,122,0.35)"   },
};
function typeLabel(type: CreatorAsset["type"]): string {
  if (type === "game")   return "Game";
  if (type === "3d_ad") return "3D Ad";
  return "Ad";
}

// ─────────────────────────────────────────────────────────────
//  DATE RANGE
// ─────────────────────────────────────────────────────────────
const DATE_RANGES = ["Today", "Last 7 Days", "Last 30 Days", "Last 90 Days", "Lifetime"] as const;
type DateRange = typeof DATE_RANGES[number];

function getRangeKey(r: DateRange): "7d" | "30d" | "90d" {
  if (r === "Last 30 Days") return "30d";
  if (r === "Last 90 Days" || r === "Lifetime") return "90d";
  return "7d";
}

function getChartArr(asset: CreatorAsset, metric: keyof CreatorAsset["charts"], range: DateRange): number[] {
  const chart = asset.charts[metric];
  if (!chart) return [];
  const key = getRangeKey(range);
  const arr: number[] = (chart[key] ?? []).map((v) => Number(v) || 0);
  return range === "Today" ? arr.slice(-1) : arr;
}

function getPeriod(asset: CreatorAsset, range: DateRange): AnalyticsPeriod {
  if (range === "Today")        return asset.today;
  if (range === "Last 7 Days")  return asset.last7Days;
  if (range === "Last 30 Days") return asset.last30Days;
  if (range === "Last 90 Days") return asset.last90Days;
  const lt = asset.lifetime;
  return {
    views:             lt.views,
    uniqueViews:       lt.uniqueViews,
    watchTimeMs:       lt.watchTimeMs,
    likes:             lt.likes,
    comments:          lt.comments,
    demoConsumptions:  lt.demoConsumptions ?? 0,
    sessions:          lt.sessions ?? 0,
    sessionPlayTimeMs: lt.sessionPlayTimeMs ?? 0,
    uniquePlayers:     lt.uniquePlayers ?? 0,
  };
}

function makeDateLabels(arr: number[], range: DateRange): string[] {
  if (range === "Today") return ["Today"];
  return arr.map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (arr.length - 1 - i));
    return `${d.getDate()}/${d.getMonth() + 1}`;
  });
}

// ─────────────────────────────────────────────────────────────
//  HOOKS
// ─────────────────────────────────────────────────────────────
function useCountUp(target: number, deps: unknown[] = [], duration = 800): number {
  const [val, setVal] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const safe = isFinite(target) && !isNaN(target) ? target : 0;
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    let start: number | null = null;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * safe));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current !== null) cancelAnimationFrame(raf.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return val;
}

// ─────────────────────────────────────────────────────────────
//  CHART.JS SETUP
// ─────────────────────────────────────────────────────────────
declare global { interface Window { Chart: any; } }

function useChartJs(): boolean {
  const [ready, setReady] = useState(!!window.Chart);
  useEffect(() => {
    if (window.Chart) { setReady(true); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);
  return ready;
}

const CHART_DEFAULTS = {
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#111",
      borderColor: "rgba(255,255,255,0.1)",
      borderWidth: 1,
      titleColor: "#fff",
      bodyColor: "rgba(255,255,255,0.55)",
      padding: 10,
    },
  },
  scales: {
    x: {
      grid: { color: "rgba(255,255,255,0.04)" },
      ticks: { color: "rgba(255,255,255,0.25)", font: { size: 10 } },
    },
    y: {
      grid: { color: "rgba(255,255,255,0.04)" },
      ticks: {
        color: "rgba(255,255,255,0.25)",
        font: { size: 10 },
        callback: (v: number) => fmt(v),
      },
      beginAtZero: true,
    },
  },
};

// ─────────────────────────────────────────────────────────────
//  SKELETON
// ─────────────────────────────────────────────────────────────
function Skeleton({ h = 60, r = 10 }: { h?: number; r?: number }) {
  return (
    <div style={{ height: h, borderRadius: r, background: "rgba(255,255,255,0.05)", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent 25%,rgba(255,255,255,0.06) 50%,transparent 75%)", backgroundSize: "400px 100%", animation: "shimmer 1.4s infinite" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SECTION LABEL
// ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.22)", whiteSpace: "nowrap" }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  KPI CARD
// ─────────────────────────────────────────────────────────────
interface KpiProps {
  icon: string;
  rawValue: number;
  displayFn?: (v: number) => string;
  label: string;
  sub?: string;
  accent?: string;
}
function KpiCard({ icon, rawValue, displayFn, label, sub, accent = T.teal }: KpiProps) {
  const safe = isFinite(rawValue) && !isNaN(rawValue) ? rawValue : 0;
  const counted = useCountUp(safe, [safe]);
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 13, color: accent }} aria-hidden="true" />
        <span style={{ fontSize: 10, color: T.textSecondary }}>{label}</span>
      </div>
      <p style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {displayFn ? displayFn(counted) : fmt(counted)}
      </p>
      {sub && <p style={{ fontSize: 10, color: T.textTertiary, marginTop: 3 }}>{sub}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  METRIC TABLE ROW
// ─────────────────────────────────────────────────────────────
function MetricRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: 12, color: T.textSecondary }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: positive === true ? T.success : positive === false ? T.negative : T.textPrimary }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MINI PROGRESS BAR
// ─────────────────────────────────────────────────────────────
function MiniProgressBar({ value, max, color = T.tealLight, height = 4 }: { value: number; max: number; color?: string; height?: number }) {
  const pctVal = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div style={{ width: "100%", height, background: "rgba(255,255,255,0.07)", borderRadius: height / 2, overflow: "hidden" }}>
      <div style={{ width: `${pctVal}%`, height: "100%", background: color, borderRadius: height / 2, transition: "width 0.8s cubic-bezier(0.16,1,0.3,1)" }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  RADIAL GAUGE
// ─────────────────────────────────────────────────────────────
function RadialGauge({ value, max, label, color = T.tealLight, size = 72 }: { value: number; max: number; label: string; color?: string; size?: number }) {
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const pctVal = max > 0 ? Math.min(1, value / max) : 0;
  const dash = pctVal * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <span style={{ fontSize: 9, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center", marginTop: -4 }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TODAY ACTIVITY CARD  (replaces single-point charts)
// ─────────────────────────────────────────────────────────────
interface TodayMetricRowProps {
  icon: string;
  label: string;
  value: string;
  rawValue: number;
  compValue: number; // 7d avg for comparison
  color?: string;
}
function TodayMetricRow({ icon, label, value, rawValue, compValue, color = T.tealLight }: TodayMetricRowProps) {
  const avgDay = compValue / 7;
  const ratio = avgDay > 0 ? rawValue / avgDay : 0;
  const isAbove = ratio > 1.1;
  const isBelow = ratio < 0.9 && avgDay > 0;
  const indicatorColor = isAbove ? T.success : isBelow ? T.negative : T.textTertiary;
  const indicatorText = isAbove ? `+${Math.round((ratio - 1) * 100)}% vs avg` : isBelow ? `${Math.round((ratio - 1) * 100)}% vs avg` : "On pace";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 13, color }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: T.textSecondary }}>{label}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>{value}</span>
        </div>
        <MiniProgressBar value={rawValue} max={Math.max(rawValue, avgDay * 1.5, 1)} color={color} height={3} />
      </div>
      {avgDay > 0 && (
        <span style={{ fontSize: 9, color: indicatorColor, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, minWidth: 72, textAlign: "right" }}>{indicatorText}</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TODAY ACTIVITY PANEL
// ─────────────────────────────────────────────────────────────
function TodayActivityPanel({ asset, cfg }: { asset: CreatorAsset; cfg: AssetCfg }) {
  const t = asset.today;
  const w7 = asset.last7Days;
  const isGame = asset.type === "game";
  const hasDemos = (asset.lifetime.demoConsumptions ?? 0) > 0;

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.success, boxShadow: `0 0 6px ${T.success}` }} />
        <span style={{ fontSize: 10, color: T.textSecondary }}>Live today · {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}</span>
      </div>
      <div>
        <TodayMetricRow icon="ti-eye"            label="Views"      value={fmt(t.views)}       rawValue={t.views}       compValue={w7.views}       color={cfg.color} />
        <TodayMetricRow icon="ti-users"          label="Unique"     value={fmt(t.uniqueViews)} rawValue={t.uniqueViews} compValue={w7.uniqueViews} color={cfg.color} />
        <TodayMetricRow icon="ti-heart"          label="Likes"      value={fmt(t.likes)}       rawValue={t.likes}       compValue={w7.likes}       color={T.warning} />
        <TodayMetricRow icon="ti-message-circle" label="Comments"   value={fmt(t.comments)}    rawValue={t.comments}    compValue={w7.comments}    color="#4a6e8a" />
        <TodayMetricRow icon="ti-clock"          label="Watch time" value={fmtMs(t.watchTimeMs)} rawValue={t.watchTimeMs} compValue={w7.watchTimeMs} color={cfg.color} />
        {hasDemos && (
          <TodayMetricRow icon="ti-player-play"  label="Demo plays" value={fmt(t.demoConsumptions)} rawValue={t.demoConsumptions} compValue={w7.demoConsumptions} color={T.success} />
        )}
        {isGame && (asset.lifetime.sessions ?? 0) > 0 && (
          <TodayMetricRow icon="ti-device-gamepad-2" label="Sessions" value={fmt(t.sessions ?? 0)} rawValue={t.sessions ?? 0} compValue={w7.sessions ?? 0} color={cfg.color} />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  LIFETIME VISUAL PANEL  (replaces single-point charts)
// ─────────────────────────────────────────────────────────────
function LifetimeVisualPanel({ asset, cfg }: { asset: CreatorAsset; cfg: AssetCfg }) {
  const lt = asset.lifetime;
  const isGame = asset.type === "game";
  const hasDemos = (lt.demoConsumptions ?? 0) > 0 && lt.uniqueViews > 0;
  const hasSessions = isGame && (lt.sessions ?? 0) > 0;

  const engRate = lt.engagementRate;
  const likeRate = safeDiv(lt.likes, lt.uniqueViews) * 100;
  const commentRate = safeDiv(lt.comments, lt.uniqueViews) * 100;
  const demoConv = safeDiv(lt.demoConsumptions ?? 0, lt.uniqueViews) * 100;
  // const retentionRate = lt.retentionRate ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Audience summary */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.22)", marginBottom: 12 }}>Audience</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Total Views", value: fmt(lt.views), icon: "ti-eye", color: cfg.color },
            { label: "Unique Views", value: fmt(lt.uniqueViews), icon: "ti-users", color: cfg.color },
            { label: "Avg Watch Time", value: fmtMs(lt.avgWatchTimeMs), icon: "ti-clock", color: T.tealLight },
            { label: "Total Watch Time", value: fmtMs(lt.watchTimeMs), icon: "ti-player-play", color: T.tealLight },
          ].map(({ label, value, icon, color }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                <i className={`ti ${icon}`} style={{ fontSize: 11, color }} aria-hidden="true" />
                <span style={{ fontSize: 9, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement rates with gauges */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
        <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.22)", marginBottom: 12 }}>Engagement</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <RadialGauge value={engRate} max={20} label="Engagement" color={cfg.color} />
            <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginTop: -2 }}>{engRate.toFixed(1)}%</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <RadialGauge value={likeRate} max={20} label="Like Rate" color={T.warning} />
            <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginTop: -2 }}>{likeRate.toFixed(2)}%</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <RadialGauge value={commentRate} max={5} label="Comment Rate" color="#4a6e8a" />
            <p style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary, marginTop: -2 }}>{commentRate.toFixed(2)}%</p>
          </div>
        </div>
        {/* Bars */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            { label: "Engagement rate", value: engRate, max: 20, color: cfg.color, display: `${engRate.toFixed(1)}%` },
            { label: "Like rate", value: likeRate, max: 20, color: T.warning, display: `${likeRate.toFixed(2)}%` },
            { label: "Comment rate", value: commentRate, max: 5, color: "#4a6e8a", display: `${commentRate.toFixed(2)}%` },
          ].map(m => (
            <div key={m.label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: T.textSecondary }}>{m.label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: T.textPrimary }}>{m.display}</span>
              </div>
              <MiniProgressBar value={m.value} max={m.max} color={m.color} height={4} />
            </div>
          ))}
        </div>
      </div>

      {/* Game performance */}
      {hasSessions && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.22)", marginBottom: 12 }}>Game Performance</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
            {[
              { label: "Sessions", value: fmt(lt.sessions!), icon: "ti-device-gamepad-2", color: cfg.color },
              { label: "Unique Players", value: fmt(lt.uniquePlayers ?? 0), icon: "ti-users", color: cfg.color },
              { label: "Avg Session", value: fmtMs(lt.avgSessionDurationMs ?? 0), icon: "ti-clock", color: T.tealLight },
              { label: "Play / User", value: fmtMs(lt.avgPlayTimePerUserMs ?? 0), icon: "ti-player-play", color: T.tealLight },
              {
  label: "Demo Users",
  value: fmt(lt.demoConsumptions ?? 0),
  icon: "ti-player-play",
  color: T.success,
},
            ].map(({ label, value, icon, color }) => (
              <div key={label} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                  <i className={`ti ${icon}`} style={{ fontSize: 11, color }} aria-hidden="true" />
                  <span style={{ fontSize: 9, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{value}</p>
              </div>
            ))}
          </div>
          {/* <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: T.textSecondary }}>Retention rate</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: retentionRate >= 25 ? T.success : T.negative }}>{retentionRate.toFixed(1)}%</span>
              </div>
              <MiniProgressBar value={retentionRate} max={100} color={retentionRate >= 25 ? T.success : T.negative} height={4} />
            </div>
          </div> */}
        </div>
      )}

      {/* Demo conversion if available */}
      {hasDemos && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
          <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.22)", marginBottom: 12 }}>Demo conversion</p>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <RadialGauge value={demoConv} max={50} label="Conv. Rate" color={T.success} size={80} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em" }}>{demoConv.toFixed(1)}%</p>
              <p style={{ fontSize: 11, color: T.textSecondary, marginTop: 2 }}>{fmt(lt.demoConsumptions ?? 0)} demo users from {fmt(lt.uniqueViews ?? 0)} unique viewers</p>
              <div style={{ marginTop: 8 }}>
                <MiniProgressBar value={demoConv} max={50} color={T.success} height={5} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  INSIGHT CARD
// ─────────────────────────────────────────────────────────────
interface InsightCardProps {
  icon: string;
  title: string;
  body: string;
  sentiment: "positive" | "warning" | "neutral";
}
function InsightCard({ icon, title, body, sentiment }: InsightCardProps) {
  const color = sentiment === "positive" ? T.success : sentiment === "warning" ? T.negative : T.textSecondary;
  const bg = sentiment === "positive" ? "rgba(91,191,170,0.06)" : sentiment === "warning" ? "rgba(201,96,96,0.06)" : "rgba(255,255,255,0.03)";
  const border = sentiment === "positive" ? "rgba(91,191,170,0.18)" : sentiment === "warning" ? "rgba(201,96,96,0.18)" : T.border;
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 16px", display: "flex", gap: 12 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${icon}`} style={{ fontSize: 14, color }} aria-hidden="true" />
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 600, color: T.textPrimary, marginBottom: 3 }}>{title}</p>
        <p style={{ fontSize: 11, color: T.textSecondary, lineHeight: 1.5 }}>{body}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ASSET INSIGHTS  (generated from analytics)
// ─────────────────────────────────────────────────────────────
function generateAssetInsights(asset: CreatorAsset): InsightCardProps[] {
  const lt = asset.lifetime;
  const gi = asset.growthIndicators;
  const insights: InsightCardProps[] = [];

  const engRate = lt.engagementRate;
  const likeRate = safeDiv(lt.likes, lt.views) * 100;
  const watchAvg = lt.avgWatchTimeMs;
  const demoConv = safeDiv(lt.demoConsumptions ?? 0, lt.uniqueViews) * 100;
  // const retention = lt.retentionRate ?? 0;

  if (gi.weekOverWeekGrowth > 15) {
    insights.push({ icon: "ti-trending-up", title: "Strong week-over-week growth", body: `Views grew ${gi.weekOverWeekGrowth.toFixed(1)}% this week — momentum is accelerating.`, sentiment: "positive" });
  } else if (gi.weekOverWeekGrowth < -15) {
    insights.push({ icon: "ti-trending-down", title: "Views declining this week", body: `Week-over-week growth is at ${gi.weekOverWeekGrowth.toFixed(1)}%. Consider refreshing your content strategy.`, sentiment: "warning" });
  }

  if (engRate >= 8) {
    insights.push({ icon: "ti-heart", title: "High engagement rate", body: `${engRate.toFixed(1)}% engagement rate is well above the typical 3–5% benchmark for platform content.`, sentiment: "positive" });
  } else if (engRate < 2) {
    insights.push({ icon: "ti-alert-triangle", title: "Low engagement rate", body: `At ${engRate.toFixed(1)}%, engagement is below average. Try more interactive or compelling presentation.`, sentiment: "warning" });
  }

  if (likeRate >= 10) {
    insights.push({ icon: "ti-thumb-up", title: "Exceptional like rate", body: `${likeRate.toFixed(1)}% of viewers liked this — a strong signal of content-audience fit.`, sentiment: "positive" });
  }

  if (watchAvg > 60000) {
    insights.push({ icon: "ti-clock", title: "Strong watch time retention", body: `Average viewers watch for ${fmtMs(watchAvg)} — indicating compelling, well-paced content.`, sentiment: "positive" });
  }

  if (demoConv >= 15 && (lt.demoConsumptions ?? 0) > 0) {
    insights.push({ icon: "ti-player-play", title: "High demo conversion", body: `${demoConv.toFixed(1)}% of unique viewers play the demo — significantly above the 5–10% typical range.`, sentiment: "positive" });
  } else if (demoConv > 0 && demoConv < 5) {
    insights.push({ icon: "ti-player-play", title: "Low demo conversion", body: `Only ${demoConv.toFixed(1)}% of viewers try the demo. Consider more prominent CTAs or a teaser moment.`, sentiment: "warning" });
  }



  return insights.slice(0, 4);
}

// ─────────────────────────────────────────────────────────────
//  LINE CHART
// ─────────────────────────────────────────────────────────────
function LineChart({
  data, color = T.tealLight, labels, name, height = 180,
}: {
  data: number[]; color?: string; labels: string[]; name: string; height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef  = useRef<any>(null);
  const ready     = useChartJs();

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: name,
          data,
          borderColor: color,
          borderWidth: 2,
          pointRadius: data.length <= 10 ? 3 : 0,
          pointHoverRadius: 4,
          pointBackgroundColor: color,
          fill: true,
          backgroundColor: color + "18",
          tension: 0.42,
        }],
      },
      options: { responsive: true, maintainAspectRatio: false, ...CHART_DEFAULTS },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [ready, data.join(","), color, labels.join(",")]);

  if (!ready) return <Skeleton h={height} />;
  return (
    <div style={{ position: "relative", height }}>
      <canvas ref={canvasRef} role="img" aria-label={`${name} chart`} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MULTI-LINE CHART
// ─────────────────────────────────────────────────────────────
function MultiLineChart({
  views, likes, comments, labels, height = 190,
}: {
  views: number[]; likes: number[]; comments: number[]; labels: string[]; height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef  = useRef<any>(null);
  const ready     = useChartJs();

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Views",    data: views,    borderColor: T.tealLight, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, fill: true, backgroundColor: T.tealLight + "14", tension: 0.42, yAxisID: "y"  },
          { label: "Likes",    data: likes,    borderColor: T.warning,   borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4, fill: false, tension: 0.42, borderDash: [4, 3], yAxisID: "y2" },
          { label: "Comments", data: comments, borderColor: "#4a6e8a",   borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 4, fill: false, tension: 0.42, borderDash: [2, 4], yAxisID: "y2" },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            display: true,
            position: "top" as const,
            labels: { color: T.textSecondary, font: { size: 11 }, boxWidth: 10, padding: 14 },
          },
          tooltip: CHART_DEFAULTS.plugins.tooltip,
        },
        scales: {
          x:  { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: "rgba(255,255,255,0.25)", font: { size: 10 } } },
          y:  { grid: { color: "rgba(255,255,255,0.04)" }, ticks: { color: T.tealLight,  font: { size: 10 }, callback: (v: number) => fmt(v) }, beginAtZero: true, position: "left" },
          y2: { grid: { drawOnChartArea: false }, ticks: { color: T.warning, font: { size: 10 }, callback: (v: number) => fmt(v) }, beginAtZero: true, position: "right" },
        },
      },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [ready, views.join(","), likes.join(","), comments.join(","), labels.join(",")]);

  if (!ready) return <Skeleton h={height} />;
  return (
    <div style={{ position: "relative", height }}>
      <canvas ref={canvasRef} role="img" aria-label="Engagement trend chart" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  BAR CHART
// ─────────────────────────────────────────────────────────────
function BarChart({
  labels, data, colors, height = 160,
}: {
  labels: string[]; data: number[]; colors: string[]; height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef  = useRef<any>(null);
  const ready     = useChartJs();

  useEffect(() => {
    if (!ready || !canvasRef.current) return;
    chartRef.current?.destroy();
    chartRef.current = new window.Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label: "Views",
          data,
          backgroundColor: colors.map(c => c + "99"),
          borderColor: colors,
          borderWidth: 1.5,
          borderRadius: 5,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...CHART_DEFAULTS,
        scales: {
          ...CHART_DEFAULTS.scales,
          x: { ...CHART_DEFAULTS.scales.x, ticks: { color: "rgba(255,255,255,0.25)", font: { size: 10 }, maxRotation: 30 } },
        },
      },
    });
    return () => { chartRef.current?.destroy(); chartRef.current = null; };
  }, [ready, data.join(","), labels.join(",")]);

  if (!ready) return <Skeleton h={height} />;
  return (
    <div style={{ position: "relative", height }}>
      <canvas ref={canvasRef} role="img" aria-label="Bar chart" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SIDEBAR ASSET ITEM
// ─────────────────────────────────────────────────────────────
function AssetItem({ asset, active, onClick }: { asset: CreatorAsset; active: boolean; onClick: () => void }) {
  const c = ASSET_CFG[asset.type];
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8, width: "100%",
        padding: "7px 8px", borderRadius: 8,
        border: `1px solid ${active ? c.border : "transparent"}`,
        background: active ? c.dim : "transparent",
        cursor: "pointer", textAlign: "left", fontFamily: "inherit",
        transition: "all 0.15s", marginBottom: 1,
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.surfaceHover; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; } }}
    >
      <div style={{ width: 26, height: 26, borderRadius: 6, background: active ? c.color + "33" : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <i className={`ti ${c.icon}`} style={{ fontSize: 12, color: active ? c.color : T.textSecondary }} aria-hidden="true" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: active ? T.textPrimary : T.textSecondary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 1 }}>
          {asset.displayName}
        </p>
        <p style={{ fontSize: 9, color: T.textTertiary }}>{fmt(asset.lifetime.views)} views</p>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  SIDEBAR
// ─────────────────────────────────────────────────────────────
function Sidebar({
  assets, activeId, onSelect, collapsed, onToggle,
}: {
  assets: CreatorAsset[];
  activeId: string | null;
  onSelect: (id: string) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<string, CreatorAsset[]> = {};
    assets.forEach(a => {
      const k = typeLabel(a.type);
      (map[k] = map[k] ?? []).push(a);
    });
    return map;
  }, [assets]);

  return (
    <div style={{
      width: collapsed ? 44 : 230, flexShrink: 0,
      background: T.bgDeep, border: `1px solid ${T.border}`, borderRadius: 12,
      display: "flex", flexDirection: "column", overflow: "hidden", transition: "width 0.25s ease",
    }}>
      <div style={{ padding: "10px 8px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        {!collapsed && <p style={{ fontSize: 11, fontWeight: 600, color: T.textPrimary, paddingLeft: 4 }}>Assets <span style={{ color: T.textTertiary, fontWeight: 400 }}>({assets.length})</span></p>}
        <button
          onClick={onToggle}
          style={{ width: 26, height: 26, borderRadius: 6, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: "auto" }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <i className={`ti ${collapsed ? "ti-chevron-right" : "ti-chevron-left"}`} style={{ fontSize: 11, color: T.textSecondary }} aria-hidden="true" />
        </button>
      </div>

      {!collapsed && (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {Object.entries(grouped).map(([type, list]) => {
            const c = ASSET_CFG[list[0].type];
            return (
              <div key={type} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "0 4px", marginBottom: 3 }}>
                  <i className={`ti ${c.icon}`} style={{ fontSize: 9, color: c.color + "aa" }} aria-hidden="true" />
                  <span style={{ fontSize: 8, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.2)" }}>{type}</span>
                </div>
                {list.map(a => (
                  <AssetItem key={a._id} asset={a} active={a._id === activeId} onClick={() => onSelect(a._id)} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {collapsed && (
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          {assets.map(a => {
            const c = ASSET_CFG[a.type];
            const active = a._id === activeId;
            return (
              <button
                key={a._id} onClick={() => onSelect(a._id)} title={a.displayName}
                style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${active ? c.border : "transparent"}`, background: active ? c.dim : "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <i className={`ti ${c.icon}`} style={{ fontSize: 13, color: active ? c.color : T.textTertiary }} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PORTFOLIO OVERVIEW
// ─────────────────────────────────────────────────────────────
function PortfolioOverview({
  assets, portfolio, dateRange,
}: {
  assets: CreatorAsset[];
  portfolio: AnalyticsPortfolio | null;
  dateRange: DateRange;
}) {
  const lt = portfolio?.lifetime;
  const totalViews    = lt?.totalViews    ?? assets.reduce((s, a) => s + (a.lifetime.views    || 0), 0);
  const totalUnique   = lt?.totalUniqueViews ?? assets.reduce((s, a) => s + (a.lifetime.uniqueViews || 0), 0);
  const totalLikes    = lt?.totalLikes    ?? assets.reduce((s, a) => s + (a.lifetime.likes    || 0), 0);
  const totalComments = lt?.totalComments ?? assets.reduce((s, a) => s + (a.lifetime.comments || 0), 0);
  const totalDemo     = lt?.totalDemoConsumptions ?? assets.reduce((s, a) => s + (a.lifetime.demoConsumptions || 0), 0);
  const totalSessions = lt?.totalSessions ?? assets.reduce((s, a) => s + (a.lifetime.sessions || 0), 0);

  const periodTotals = useMemo(() => assets.reduce((acc, a) => {
    const p = getPeriod(a, dateRange);
    acc.views    += p.views    || 0;
    acc.likes    += p.likes    || 0;
    acc.comments += p.comments || 0;
    acc.demo     += p.demoConsumptions || 0;
    acc.sessions += p.sessions || 0;
    return acc;
  }, { views: 0, likes: 0, comments: 0, demo: 0, sessions: 0 }), [assets, dateRange]);

  const sortedByViews = [...assets].sort((a, b) => (b.lifetime.views || 0) - (a.lifetime.views || 0));
  const sortedByConv  = [...assets]
    .filter(a => (a.lifetime.demoConsumptions || 0) > 0)
    .sort((a, b) => safeDiv(b.lifetime.demoConsumptions!, b.lifetime.uniqueViews) - safeDiv(a.lifetime.demoConsumptions!, a.lifetime.uniqueViews));

  const barLabels = sortedByViews.slice(0, 6).map(a => a.displayName.slice(0, 14));
  const barData   = sortedByViews.slice(0, 6).map(a => getPeriod(a, dateRange).views || 0);
  const barColors = sortedByViews.slice(0, 6).map(a => ASSET_CFG[a.type].color);

  const rangeLabel = dateRange === "Today" ? "today" : dateRange.toLowerCase();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em", marginBottom: 3 }}>Portfolio Overview</h1>
        <p style={{ fontSize: 12, color: T.textSecondary }}>{assets.length} assets total</p>
      </div>

      {/* Lifetime KPIs */}
      <section>
        <SectionLabel>Lifetime totals</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          <KpiCard icon="ti-eye"              rawValue={totalViews}    label="Views"           />
          <KpiCard icon="ti-users"            rawValue={totalUnique}   label="Unique views"    />
          <KpiCard icon="ti-heart"            rawValue={totalLikes}    label="Likes"           />
          <KpiCard icon="ti-message-circle"   rawValue={totalComments} label="Comments"        />
          <KpiCard icon="ti-player-play"      rawValue={totalDemo}     label="Demo plays"      />
          <KpiCard icon="ti-device-gamepad-2" rawValue={totalSessions} label="Game sessions"   />
          <KpiCard icon="ti-stack-2"          rawValue={assets.length} label="Total assets"    displayFn={v => String(v)} />
          <KpiCard
            icon="ti-chart-pie"
            rawValue={Math.round(safeDiv(assets.reduce((s, a) => s + (a.lifetime.engagementRate || 0), 0), assets.length) * 10)}
            displayFn={v => (v / 10).toFixed(1) + "%"}
            label="Avg engagement"
          />
        </div>
      </section>

      {/* Period KPIs */}
      <section>
        <SectionLabel>{dateRange} activity</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          <KpiCard icon="ti-eye"              rawValue={periodTotals.views}    label="Views"     />
          <KpiCard icon="ti-heart"            rawValue={periodTotals.likes}    label="Likes"     />
          <KpiCard icon="ti-message-circle"   rawValue={periodTotals.comments} label="Comments"  />
          <KpiCard icon="ti-player-play"      rawValue={periodTotals.demo}     label="Demos"     />
          <KpiCard icon="ti-device-gamepad-2" rawValue={periodTotals.sessions} label="Sessions"  />
        </div>
      </section>

      {/* Views by asset chart */}
      <section>
        <SectionLabel>Views by asset — {rangeLabel}</SectionLabel>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
          <BarChart labels={barLabels} data={barData} colors={barColors} height={160} />
        </div>
      </section>

      {/* Asset mix */}
      <section>
        <SectionLabel>Asset mix</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          {(["game", "ad", "3d_ad"] as const).map(t => {
            const c = ASSET_CFG[t];
            const count = assets.filter(a => a.type === t).length;
            const views = assets.filter(a => a.type === t).reduce((s, a) => s + (a.lifetime.views || 0), 0);
            return (
              <div key={t} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <i className={`ti ${c.icon}`} style={{ fontSize: 13, color: c.color }} aria-hidden="true" />
                  <span style={{ fontSize: 10, color: T.textSecondary }}>{typeLabel(t)}</span>
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1 }}>{count}</p>
                <p style={{ fontSize: 10, color: T.textTertiary, marginTop: 3 }}>{fmt(views)} total views</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top performers */}
      <section>
        <SectionLabel>Top performers</SectionLabel>
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: "hidden" }}>
          {sortedByViews.slice(0, 3).map((a, i) => {
            const c = ASSET_CFG[a.type];
            return (
              <div key={a._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
                <span style={{ fontSize: 11, color: T.textTertiary, width: 14, textAlign: "right" }}>{i + 1}</span>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: c.dim, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`ti ${c.icon}`} style={{ fontSize: 11, color: c.color }} aria-hidden="true" />
                </div>
                <p style={{ flex: 1, fontSize: 12, fontWeight: 500, color: T.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.displayName}</p>
                <span style={{ fontSize: 11, color: T.textSecondary }}>{fmt(a.lifetime.views)} views</span>
                <span style={{ fontSize: 10, color: T.tealLight, fontWeight: 600 }}>{a.lifetime.engagementRate.toFixed(1)}% eng</span>
              </div>
            );
          })}
        </div>
      </section>

      {sortedByConv.length > 0 && (
        <section>
          <SectionLabel>Best demo conversion</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: ASSET_CFG[sortedByConv[0].type].dim, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-player-play" style={{ fontSize: 13, color: ASSET_CFG[sortedByConv[0].type].color }} aria-hidden="true" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 500, color: T.textPrimary }}>{sortedByConv[0].displayName}</p>
              <p style={{ fontSize: 10, color: T.textSecondary }}>{fmt(sortedByConv[0].lifetime.demoConsumptions!)} demos from {fmt(sortedByConv[0].lifetime.uniqueViews)} unique views</p>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.tealLight }}>
              {pct(safeDiv(sortedByConv[0].lifetime.demoConsumptions!, sortedByConv[0].lifetime.uniqueViews))}
            </span>
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ASSET ANALYTICS  (single asset panel)
// ─────────────────────────────────────────────────────────────
function AssetAnalytics({ asset, dateRange }: { asset: CreatorAsset; dateRange: DateRange }) {
  const cfg    = ASSET_CFG[asset.type];
  const lt     = asset.lifetime;
  const stats  = getPeriod(asset, dateRange);
  const gi     = asset.growthIndicators ?? { weekOverWeekGrowth: 0, monthOverMonthGrowth: 0, trend: "stable" as const };

  const isToday    = dateRange === "Today";
  const isLifetime = dateRange === "Lifetime";
  const isTimeSeries = !isToday && !isLifetime;

  // Chart data only for time-series ranges
  const vArr = isTimeSeries ? getChartArr(asset, "views",            dateRange) : [];
  const lArr = isTimeSeries ? getChartArr(asset, "likes",            dateRange) : [];
  const cArr = isTimeSeries ? getChartArr(asset, "comments",         dateRange) : [];
  const dArr = isTimeSeries ? getChartArr(asset, "demoConsumptions", dateRange) : [];
  const sArr = isTimeSeries ? getChartArr(asset, "sessions",         dateRange) : [];
  const wArr = isTimeSeries ? getChartArr(asset, "watchTime",        dateRange) : [];
  const labels = isTimeSeries ? makeDateLabels(vArr, dateRange) : [];

  const likeRate     = safeDiv(lt.likes, lt.uniqueViews, 0);
  const commentRate  = safeDiv(lt.comments, lt.uniqueViews, 0);
  const demoConvRate = safeDiv(lt.demoConsumptions ?? 0, lt.uniqueViews, 0);
  const playerConvRate =
  safeDiv(
    lt.uniquePlayers ?? 0,
    lt.uniqueViews,
    0
  ) * 100;

  const isGame      = asset.type === "game";
  const hasDemos    = (lt.demoConsumptions ?? 0) > 0 && lt.uniqueViews > 0;
  const hasSessions = isGame && (lt.sessions ?? 0) > 0;

  const trendColor  = gi.trend === "up" ? T.success : gi.trend === "down" ? T.negative : T.textTertiary;
  const trendArrow  = gi.trend === "up" ? "↑" : gi.trend === "down" ? "↓" : "→";
  const rangeLabel  = isToday ? "today" : dateRange.toLowerCase();

  const vTotal = vArr.reduce<number>((a, b) => a + (b ?? 0), 0);
  const dTotal = dArr.reduce<number>((a, b) => a + (b ?? 0), 0);
  const sTotal = sArr.reduce<number>((a, b) => a + (b ?? 0), 0);

  const insights = useMemo(() => generateAssetInsights(asset), [asset._id]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>

      {/* Header */}
      <header style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div style={{ width: 46, height: 46, borderRadius: 12, background: cfg.dim, border: `1px solid ${cfg.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <i className={`ti ${cfg.icon}`} style={{ fontSize: 20, color: cfg.color }} aria-hidden="true" />
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "2px 7px", borderRadius: 100, background: cfg.dim, color: cfg.color, border: `1px solid ${cfg.border}` }}>
              {typeLabel(asset.type)}
            </span>
            <span style={{ fontSize: 10, fontWeight: 600, color: trendColor }}>{trendArrow} {Math.abs(gi.weekOverWeekGrowth).toFixed(1)}% WoW</span>
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em", lineHeight: 1.2, marginBottom: 2 }}>{asset.displayName}</h2>
          <p style={{ fontSize: 11, color: T.textSecondary }}>{dateRange}</p>
        </div>
      </header>

      {/* Period KPIs */}
      <section>
        <SectionLabel>{dateRange} metrics</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
          <KpiCard icon="ti-eye"            rawValue={stats.views}       label="Views"            accent={cfg.color} />
          <KpiCard icon="ti-users"          rawValue={stats.uniqueViews} label="Unique views"     accent={cfg.color} />
          <KpiCard icon="ti-heart"          rawValue={stats.likes}       label="Likes"            accent={cfg.color} />
          <KpiCard icon="ti-message-circle" rawValue={stats.comments}    label="Comments"         accent={cfg.color} />
          <KpiCard icon="ti-clock"          rawValue={stats.watchTimeMs} label="Watch time"       displayFn={fmtMs} accent={cfg.color} />
          {hasDemos && (
            <KpiCard icon="ti-player-play"  rawValue={stats.demoConsumptions} label="Demo plays"  accent={cfg.color} />
          )}
          {hasSessions && (
            <KpiCard icon="ti-device-gamepad-2" rawValue={stats.sessions ?? 0} label="Sessions"  accent={cfg.color} />
          )}
        </div>
      </section>

      {/* TODAY — activity panel instead of charts */}
      {isToday && (
        <section>
          <SectionLabel>Today's activity vs 7-day average</SectionLabel>
          <TodayActivityPanel asset={asset} cfg={cfg} />
        </section>
      )}

      {/* LIFETIME — visual panels instead of charts */}
      {isLifetime && (
        <section>
          <SectionLabel>Lifetime performance breakdown</SectionLabel>
          <LifetimeVisualPanel asset={asset} cfg={cfg} />
        </section>
      )}

      {/* TIME SERIES — views trend chart */}
      {isTimeSeries && (
        <section>
          <SectionLabel>Views trend — {rangeLabel}</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.textPrimary }}>{fmt(vTotal)}</span>
              <span style={{ fontSize: 11, color: T.textSecondary }}>views {rangeLabel}</span>
              <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 600, color: trendColor }}>{trendArrow} {Math.abs(gi.weekOverWeekGrowth).toFixed(1)}% WoW</span>
            </div>
            {vArr.length > 0 && vArr.some(v => v > 0)
              ? <LineChart data={vArr} color={cfg.color} labels={labels} name="Views" height={170} />
              : <div style={{ height: 170, display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, fontSize: 12 }}>No view data for this period</div>
            }
          </div>
        </section>
      )}

      {/* TIME SERIES — engagement chart */}
      {isTimeSeries && (
        <section>
          <SectionLabel>Engagement — {rangeLabel}</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
            {vArr.length > 0
              ? <MultiLineChart views={vArr} likes={lArr} comments={cArr} labels={labels} height={190} />
              : <div style={{ height: 190, display: "flex", alignItems: "center", justifyContent: "center", color: T.textTertiary, fontSize: 12 }}>No engagement data for this period</div>
            }
          </div>
        </section>
      )}

      {/* TIME SERIES — watch time chart */}
      {isTimeSeries && wArr.length > 0 && wArr.some(v => (v ?? 0) > 0) && (
        <section>
          <SectionLabel>Watch time — {rangeLabel}</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{fmtMs(stats.watchTimeMs)}</span>
              <span style={{ fontSize: 11, color: T.textSecondary }}>total · {fmtMs(lt.avgWatchTimeMs)} avg/view</span>
            </div>
            <LineChart data={wArr.map(v => Math.round(v / 1000))} color={T.teal} labels={labels} name="Watch time (s)" height={160} />
          </div>
        </section>
      )}

      {/* TIME SERIES — demo chart */}
      {isTimeSeries && isGame && dArr.length > 0 && dArr.some(v => (v ?? 0) > 0) && (
        <section>
          <SectionLabel>Demo plays — {rangeLabel}</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{fmt(dTotal)}</span>
              <span style={{ fontSize: 11, color: T.textSecondary }}>demos {rangeLabel}</span>
            </div>
            <LineChart data={dArr.map(v => Number(v ?? 0))} color={T.success} labels={labels} name="Demo plays" height={150} />
          </div>
        </section>
      )}

      {/* TIME SERIES — sessions chart */}
      {isTimeSeries && hasSessions && sArr.length > 0 && sArr.some(v => (v ?? 0) > 0) && (
        <section>
          <SectionLabel>Game sessions — {rangeLabel}</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", marginBottom: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary }}>{fmt(sTotal)}</span>
              <span style={{ fontSize: 11, color: T.textSecondary }}>sessions {rangeLabel}</span>
            </div>
            <LineChart data={sArr.map(v => Number(v ?? 0))} color={cfg.color} labels={labels} name="Sessions" height={150} />
          </div>
        </section>
      )}

      {/* Lifetime engagement visual KPIs + table */}
      <section>
        <SectionLabel>Lifetime engagement</SectionLabel>
        {/* Visual KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8, marginBottom: 10 }}>
          <KpiCard icon="ti-chart-pie"        rawValue={Math.round(lt.engagementRate * 10)}  displayFn={v => (v / 10).toFixed(1) + "%"} label="Engagement rate" accent={cfg.color} />
          <KpiCard icon="ti-clock"            rawValue={lt.avgWatchTimeMs}                   displayFn={fmtMs}                          label="Avg watch time"  accent={cfg.color} />
          {hasDemos && <KpiCard icon="ti-player-play" rawValue={Math.round(demoConvRate * 1000)} displayFn={v => (v / 10).toFixed(1) + "%"} label="Demo conv. rate" accent={T.success} />}
          {/* {hasSessions && <KpiCard icon="ti-users"    rawValue={lt.retentionRate ?? 0}           displayFn={v => Math.round(v) + "%"}       label="Retention rate"  accent={T.success} />} */}
        </div>
        {/* Detailed table */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "2px 14px 6px" }}>
          <MetricRow label="Total views"     value={fmt(lt.views)}                                   />
          <MetricRow label="Unique views"    value={fmt(lt.uniqueViews)}                             />

          <MetricRow label="Like rate"       value={`${(likeRate * 100).toFixed(2)}%`}              positive={likeRate >= 0.08} />
          <MetricRow label="Comment rate"    value={`${(commentRate * 100).toFixed(2)}%`}           positive={commentRate >= 0.02} />
          <MetricRow label="Engagement rate" value={`${lt.engagementRate.toFixed(2)}%`}             positive={lt.engagementRate >= 3} />
          <MetricRow label="Avg watch time"  value={fmtMs(lt.avgWatchTimeMs)}                       />
          {hasDemos && (
            <>
              <MetricRow label="Demo plays"            value={fmt(lt.demoConsumptions!)}            />
              <MetricRow label="Demo conversion rate"  value={`${(demoConvRate * 100).toFixed(2)}%`} positive={demoConvRate >= 0.1} />
              <MetricRow
  label="View → Play Conversion"
  value={`${playerConvRate.toFixed(2)}%`}
/>
<MetricRow
  label="View → Demo Conversion"
  value={`${(demoConvRate * 100).toFixed(2)}%`}
/>

              {/* {lt.demoConversionRate !== undefined && (
                <MetricRow label="Demo conv (server)"  value={`${lt.demoConversionRate.toFixed(2)}%`} />
              )} */}
            </>
          )}
          {hasSessions && (
            <>
              <MetricRow label="Total sessions"        value={fmt(lt.sessions!)}                   />
              <MetricRow label="Unique players"        value={fmt(lt.uniquePlayers ?? 0)}           />
              {/* <MetricRow label="Retention rate"        value={`${(lt.retentionRate ?? 0).toFixed(1)}%`} positive={(lt.retentionRate ?? 0) >= 25} /> */}
              <MetricRow label="Avg session length"    value={fmtMs(lt.avgSessionDurationMs ?? 0)} />
              <MetricRow label="Avg play time / user"  value={fmtMs(lt.avgPlayTimePerUserMs ?? 0)} />
            </>
          )}
          {asset.type === "3d_ad" && (lt.vertices ?? 0) > 0 && (
            <>
              <MetricRow label="Vertices"  value={fmt(lt.vertices!)}  />
              <MetricRow label="Triangles" value={fmt(lt.triangles!)} />
            </>
          )}
        </div>
      </section>

      {/* Growth */}
      <section>
        <SectionLabel>Growth</SectionLabel>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { label: "Week over week",   val: gi.weekOverWeekGrowth },
            { label: "Month over month", val: gi.monthOverMonthGrowth },
          ].map(({ label, val }) => (
            <div key={label} style={{ flex: 1, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "12px 14px" }}>
              <p style={{ fontSize: 9, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>{label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: val >= 0 ? T.success : T.negative, letterSpacing: "-0.02em" }}>
                {val >= 0 ? "+" : ""}{val.toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Conversion funnel (game with demos) */}
      {isGame && hasDemos && (
        <section>
          <SectionLabel>Conversion funnel</SectionLabel>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: "20px 24px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
              {/* Views */}
              <div style={{ width: "80%", background: "rgba(61,122,110,0.12)", border: "1px solid rgba(61,122,110,0.28)", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 9, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Total views</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em" }}>{fmt(lt.views)}</p>
              </div>

              {/* Step: views → unique */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0" }}>
                <div style={{ width: 1, height: 12, background: "rgba(61,122,110,0.3)" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: T.textSecondary, padding: "2px 8px", background: "rgba(61,122,110,0.08)", borderRadius: 6, border: "1px solid rgba(61,122,110,0.18)" }}>
                  {pct(safeDiv(lt.uniqueViews, lt.views))} unique
                </span>
                <div style={{ width: 1, height: 12, background: "rgba(61,122,110,0.3)" }} />
              </div>

              {/* Unique views */}
              <div style={{ width: `${Math.max(50, Math.round(safeDiv(lt.uniqueViews, lt.views) * 80))}%`, background: "rgba(61,122,110,0.18)", border: "1px solid rgba(61,122,110,0.36)", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 9, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Unique views</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em" }}>{fmt(lt.uniqueViews)}</p>
              </div>

              {/* Step: unique → demo */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0" }}>
                <div style={{ width: 1, height: 12, background: "rgba(61,122,110,0.3)" }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: T.tealLight, padding: "2px 8px", background: "rgba(61,122,110,0.12)", borderRadius: 6, border: "1px solid rgba(61,122,110,0.28)" }}>
                  {(demoConvRate * 100).toFixed(1)}% demo conv.
                </span>
                <div style={{ width: 1, height: 12, background: "rgba(61,122,110,0.3)" }} />
              </div>

              {/* Demo plays */}
              <div style={{ width: `${Math.max(24, Math.round(demoConvRate * 80))}%`, background: "rgba(61,122,110,0.28)", border: "1px solid rgba(61,122,110,0.5)", borderRadius: 10, padding: "14px 16px", textAlign: "center" }}>
                <p style={{ fontSize: 9, color: T.textTertiary, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 6 }}>Demo plays</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.02em" }}>{fmt(lt.demoConsumptions!)}</p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <section>
          <SectionLabel>Insights</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {insights.map((ins, i) => (
              <InsightCard key={i} {...ins} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  EMPTY / LOADING STATES
// ─────────────────────────────────────────────────────────────
function LoadingState() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg, fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: T.tealDim, border: `1px solid ${T.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
          <i className="ti ti-chart-bar" style={{ fontSize: 17, color: T.tealLight }} aria-hidden="true" />
        </div>
        <p style={{ color: T.textSecondary, fontSize: 13 }}>Loading analytics…</p>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Skeleton h={60} r={10} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        {[1,2,3,4,5,6].map(i => <Skeleton key={i} h={90} r={10} />)}
      </div>
      <Skeleton h={200} r={10} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        {[1,2,3,4].map(i => <Skeleton key={i} h={75} r={10} />)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  DEFAULTS
// ─────────────────────────────────────────────────────────────
function emptyPeriod(): AnalyticsPeriod {
  return { views: 0, uniqueViews: 0, watchTimeMs: 0, likes: 0, comments: 0, demoConsumptions: 0, sessions: 0, sessionPlayTimeMs: 0, uniquePlayers: 0 };
}
function emptyChart(): MultiRangeChart {
  return { "7d": [], "30d": [], "90d": [] };
}

// ─────────────────────────────────────────────────────────────
//  ROOT
// ─────────────────────────────────────────────────────────────
export default function RigzerPortfolioAnalytics() {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const [assets,        setAssets]        = useState<CreatorAsset[]>([]);
  const [portfolio,     setPortfolio]     = useState<AnalyticsPortfolio | null>(null);
  const [apiLoading,    setApiLoading]    = useState(true);
  const [activeId,      setActiveId]      = useState<string | null>(null);
  const [dateRange,     setDateRange]     = useState<DateRange>("Last 7 Days");
  const [sideCollapsed, setSideCollapsed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const activeAsset = assets.find(a => a._id === activeId) ?? null;

  const navigate = (id: string | null) => {
    if (id === activeId) return;
    setTransitioning(true);
    setTimeout(() => { setActiveId(id); setTransitioning(false); }, 220);
  };

  useEffect(() => {
    (async () => {
      try {
        setApiLoading(true);
        const { data } = await axios.get(`${BACKEND_URL}/api/analytics/creator`, { withCredentials: true });

        const normalised: CreatorAsset[] = (data.assets || []).map((a: any): CreatorAsset => ({
          _id:         String(a._id),
          type:        a.type,
          displayName: a.displayName || "Untitled",

          today:      a.today      ?? emptyPeriod(),
          last7Days:  a.last7Days  ?? emptyPeriod(),
          last30Days: a.last30Days ?? emptyPeriod(),
          last90Days: a.last90Days ?? emptyPeriod(),

          charts: {
            views:            a.charts?.views            ?? emptyChart(),
            uniqueViews:      a.charts?.uniqueViews      ?? emptyChart(),
            watchTime:        a.charts?.watchTime        ?? emptyChart(),
            likes:            a.charts?.likes            ?? emptyChart(),
            comments:         a.charts?.comments         ?? emptyChart(),
            demoConsumptions: a.charts?.demoConsumptions ?? emptyChart(),
            sessions:         a.charts?.sessions         ?? emptyChart(),
            playTime:         a.charts?.playTime         ?? emptyChart(),
            conversionRate:   a.charts?.conversionRate   ?? emptyChart(),
          },

          growthIndicators: a.growthIndicators ?? { weekOverWeekGrowth: 0, monthOverMonthGrowth: 0, trend: "stable" },

          lifetime: {
            views:                Number(a.lifetime?.views)               || Number(a.totalViews)       || 0,
            uniqueViews:          Number(a.lifetime?.uniqueViews)         || Number(a.uniqueViews)      || 0,
            watchTimeMs:          Number(a.lifetime?.watchTimeMs)         || 0,
            avgWatchTimeMs:       Number(a.lifetime?.avgWatchTimeMs)      || 0,
            likes:                Number(a.lifetime?.likes)               || Number(a.likes)            || 0,
            comments:             Number(a.lifetime?.comments)            || Number(a.comments)         || 0,
            engagementRate:       Number(a.lifetime?.engagementRate)      || 0,
            demoConsumptions:     Number(a.lifetime?.demoConsumptions)    || Number(a.demoConsumption)  || 0,
            demoConversionRate:   Number(a.lifetime?.demoConversionRate)  || 0,
            sessions:             Number(a.lifetime?.sessions)            || Number(a.totalSessions)    || 0,
            sessionPlayTimeMs:    Number(a.lifetime?.sessionPlayTimeMs)   || Number(a.totalSessionTime) || 0,
            avgSessionDurationMs: Number(a.lifetime?.avgSessionDurationMs)|| 0,
            avgPlayTimePerUserMs: Number(a.lifetime?.avgPlayTimePerUserMs) || 0,
            uniquePlayers:        Number(a.lifetime?.uniquePlayers)       || 0,
            // repeatPlayers:        Number(a.lifetime?.repeatPlayers)       || 0,
            // retentionRate:        Number(a.lifetime?.retentionRate)       || 0,
            vertices:             Number(a.lifetime?.vertices)            || Number(a.vertices)         || 0,
            triangles:            Number(a.lifetime?.triangles)           || Number(a.triangles)        || 0,
          },

          totalViews:      Number(a.totalViews)      || 0,
          uniqueViews:     Number(a.uniqueViews)     || 0,
          likes:           Number(a.likes)           || 0,
          comments:        Number(a.comments)        || 0,
          demoConsumption: Number(a.demoConsumption) || 0,
          conversionRate:  Number(a.conversionRate)  || 0,
          totalSessions:   Number(a.totalSessions)   || 0,
          totalSessionTime:Number(a.totalSessionTime)|| 0,
        }));

        setAssets(normalised);
        setActiveId(normalised.length > 0 ? normalised[0]._id : null);
        setPortfolio(data.portfolio ?? null);
      } catch (err) {
        console.error("Analytics fetch failed:", err);
      } finally {
        setApiLoading(false);
      }
    })();
  }, [BACKEND_URL]);

  if (apiLoading) return <LoadingState />;

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'DM Sans',sans-serif", color: T.textPrimary }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .rig-panel { animation: fadeUp 0.25s ease forwards; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-thumb { background: rgba(61,122,110,0.3); border-radius: 2px; }
        button { font-family: inherit; }
      `}</style>

      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* TOP BAR */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.tealDim, border: `1px solid ${T.tealBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <i className="ti ti-chart-bar" style={{ fontSize: 14, color: T.tealLight }} aria-hidden="true" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: T.textPrimary }}>Creator Analytics</span>
          </div>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: `1px solid ${T.border}`, borderRadius: 8, padding: 3, gap: 2 }}>
            {DATE_RANGES.map(r => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                style={{
                  fontSize: 11, fontWeight: 500, padding: "4px 9px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: dateRange === r ? T.teal : "transparent",
                  color: dateRange === r ? "#fff" : T.textSecondary,
                  transition: "all 0.18s",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* LAYOUT */}
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>

          {/* SIDEBAR */}
          <div style={{ flexShrink: 0, position: "sticky", top: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Portfolio button */}
            <button
              onClick={() => navigate(null)}
              style={{
                display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 8px",
                borderRadius: 8, border: `1px solid ${activeId === null ? T.tealBorder : "transparent"}`,
                background: activeId === null ? T.tealDim : "transparent", cursor: "pointer", textAlign: "left", transition: "all 0.18s",
              }}
              onMouseEnter={e => { if (activeId !== null) e.currentTarget.style.background = T.surfaceHover; }}
              onMouseLeave={e => { if (activeId !== null) e.currentTarget.style.background = "transparent"; }}
            >
              {!sideCollapsed ? (
                <>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: activeId === null ? "rgba(61,122,110,0.3)" : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <i className="ti ti-layout-dashboard" style={{ fontSize: 12, color: activeId === null ? T.tealLight : T.textSecondary }} aria-hidden="true" />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: activeId === null ? T.tealLight : T.textSecondary }}>Portfolio</span>
                </>
              ) : (
                <div style={{ width: 30, height: 30, borderRadius: 7, background: activeId === null ? "rgba(61,122,110,0.25)" : "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className="ti ti-layout-dashboard" style={{ fontSize: 13, color: activeId === null ? T.tealLight : T.textTertiary }} aria-hidden="true" />
                </div>
              )}
            </button>

            <Sidebar assets={assets} activeId={activeId} onSelect={id => navigate(id)} collapsed={sideCollapsed} onToggle={() => setSideCollapsed(v => !v)} />
          </div>

          {/* MAIN */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {transitioning
              ? <PanelSkeleton />
              : (
                <div className="rig-panel">
                  {activeAsset
                    ? <AssetAnalytics  asset={activeAsset} dateRange={dateRange} />
                    : <PortfolioOverview assets={assets} portfolio={portfolio} dateRange={dateRange} />
                  }
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}