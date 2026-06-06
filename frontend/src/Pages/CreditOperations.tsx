import { useState, useEffect, useCallback, useRef } from "react";
import axios,{AxiosRequestConfig} from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Creator {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  isVerified?: boolean;
}

interface CreatorSummary {
  totalGames: number;
  totalSessions: number;
  totalPlayTime: number;
  totalCreditsPurchased: number;
  totalCreditsConsumed: number;
  remainingCredits: number;
}

interface CreatorDetail {
  creator: Creator;
  summary: CreatorSummary;
}

interface CreditBudget {
  remainingCredits: number;
  usedCredits: number;
  totalPurchasedCredits: number;
  status: "active" | "low_credits" | "exhausted" | "hidden";
}

interface GameMetrics {
  totalSessions: number;
  totalSessionTimeMs: number;
  uniquePlayers?: number;
  avgSessionMs?: number;
}

interface Game {
  _id: string;
  gameName: string;
  version?: string;
  createdAt: string;
  visibility?: string;
  creditBudget: CreditBudget;
  gameMetrics: GameMetrics;
  burnRate?: number;
  daysRemaining?: number;
  thumbnail?: string;
}

interface BurnRateData {
  burnedToday: number;
  burned7Days: number;
  burned30Days: number;
  averageDailyBurn: number;
  estimatedDaysRemaining: number | null;
}

interface TrendPoint {
  _id: string; // date string YYYY-MM-DD
  credits: number;
}

interface AuditLog {
  _id: string;
  createdAt: string;
  admin: { username: string; avatar?: string } | string;
  action: string;
  gamePost: { "gamePost.gameName"?: string; gameName?: string } | string;
  creator: { username: string } | string;
  credits: number;
  previousBalance: number;
  newBalance: number;
  reason?: string;
}

interface AuditFilters {
  action: string;
  creatorId: string;
  gamePostId: string;
  page: number;
}

interface DashboardData {
  totalActiveGames: number;
  exhaustedGames: number;
  lowCreditGames: number;
  totalCreditsRemaining: number;
  creditsConsumedToday: number;
  creditsGiftedToday: number;
  creditsDeductedToday: number;
}

interface Alert {
  type: "low" | "exhausted" | "hidden";
  gameName: string;
  gameId: string;
  remaining: number;
}

// ── API ───────────────────────────────────────────────────────────────────────

const BASE =
  `${import.meta.env.VITE_BACKEND_URL}/api/admin/credits`;

  console.log(BASE);

async function apiFetch<T>(
  path: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const { data } = await axios({
    url: `${BASE}${path}`,
    withCredentials: true,
    ...config,
  });

  return data;
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtNum = (n?: number) => (n ?? 0).toLocaleString("en-IN");
const fmtMs = (ms?: number) => {
  if (!ms) return "0m";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (d?: string) =>
  d ? new Date(d).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "—";

// ── Pill ──────────────────────────────────────────────────────────────────────

const pillMap: Record<string, { label: string; cls: string }> = {
  active:          { label: "Active",       cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  low_credits:     { label: "Low Credits",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  exhausted:       { label: "Exhausted",    cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  credit_exhausted:{ label: "Exhausted",    cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  hidden:          { label: "Hidden",       cls: "bg-white/[0.08] text-white/50 border-white/[0.15]" },
  purchase:        { label: "Purchase",     cls: "bg-green-500/[0.12] text-green-400 border-green-500/25" },
  gift:            { label: "Gift",         cls: "bg-teal-600/15 text-teal-400 border-teal-600/30" },
  deduct:          { label: "Deduct",       cls: "bg-red-500/[0.12] text-red-400 border-red-500/25" },
  set_balance:     { label: "Set Balance",  cls: "bg-amber-500/[0.12] text-amber-400 border-amber-500/25" },
  consumption:     { label: "Consumption",  cls: "bg-white/[0.06] text-white/50 border-white/[0.15]" },
  refund:          { label: "Refund",       cls: "bg-green-500/[0.12] text-green-400 border-green-500/25" },
  reactivate:      { label: "Reactivate",   cls: "bg-teal-600/15 text-teal-400 border-teal-600/30" },
  hide:            { label: "Hide",         cls: "bg-white/[0.06] text-white/50 border-white/[0.15]" },
  unhide:          { label: "Unhide",       cls: "bg-green-500/[0.12] text-green-400 border-green-500/25" },
};

function Pill({ status }: { status: string }) {
  const s = pillMap[status] || pillMap.active;
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonCard({ h = "h-16" }: { h?: string }) {
  return <div className={`${h} rounded-2xl bg-white/5 border border-white/9 animate-pulse`} />;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/4">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <td key={i} className="px-3 py-2.5">
          <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: `${40 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white/5 border border-white/9 backdrop-blur-lg rounded-2xl p-4 flex flex-col gap-1.5">
      <span className="text-[11px] text-white/45 font-semibold uppercase tracking-widest">{label}</span>
      <span className={`text-[22px] font-bold leading-none ${accent || "text-white/92"}`}>{value}</span>
      {sub && <span className="text-[11px] text-white/25">{sub}</span>}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────

type BtnVariant = "ghost" | "teal" | "danger" | "amber";

const btnVariants: Record<BtnVariant, string> = {
  ghost:  "bg-white/5 border border-white/9 text-white/50 hover:text-white/80",
  teal:   "bg-gradient-to-br from-teal-600 to-teal-800 border border-teal-600/30 text-white hover:from-teal-500",
  danger: "bg-red-500/[0.12] border border-red-500/[0.28] text-red-400 hover:bg-red-500/20",
  amber:  "bg-amber-500/[0.12] border border-amber-500/[0.28] text-amber-400 hover:bg-amber-500/20",
};

function Btn({ children, onClick, variant = "ghost", disabled, className = "" }: {
  children: React.ReactNode; onClick?: () => void; variant?: BtnVariant;
  disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${btnVariants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`}
    >
      {children}
    </button>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────────

function Input({ value, onChange, placeholder, className = "" }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; className?: string;
}) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full bg-white/5 border border-white/9 rounded-xl px-3 py-2 text-[13px] text-white/92 placeholder-white/25 outline-none focus:border-teal-600/50 transition-colors ${className}`}
    />
  );
}

// ── Select ────────────────────────────────────────────────────────────────────

function Select({ value, onChange, options, className = "" }: {
  value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[]; className?: string;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      className={`w-full bg-[#1a1a1a] border border-white/9 rounded-xl px-3 py-2 text-[13px] text-white/92 outline-none focus:border-teal-600/50 transition-colors ${className}`}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center backdrop-blur-sm">
      <div className="bg-gradient-to-br from-teal-900/40 to-black/80 border border-teal-600/[0.28] backdrop-blur-2xl rounded-2xl p-6 w-[420px] max-w-[90vw]">
        <div className="flex justify-between items-center mb-4">
          <span className="font-bold text-[15px] text-white/92">{title}</span>
          <button onClick={onClose} className="text-white/45 hover:text-white/80 bg-transparent border-none text-lg cursor-pointer">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type, onDone }: { message: string; type: "ok" | "err"; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed bottom-6 right-6 z-[2000] px-4 py-3 rounded-xl text-sm font-semibold border backdrop-blur-lg shadow-2xl
      ${type === "ok" ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-red-500/15 border-red-500/30 text-red-400"}`}>
      {message}
    </div>
  );
}

// ── Mini Sparkline ────────────────────────────────────────────────────────────

function MiniSparkline({ data, label }: { data: TrendPoint[]; label: string }) {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => d.credits), 1);
  const W = 200, H = 48;
  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * W;
    const y = H - (d.credits / max) * H;
    return `${x},${y}`;
  });
  const area = `M${pts[0]} L${pts.join(" L")} L${W},${H} L0,${H} Z`;
  const line = `M${pts[0]} L${pts.join(" L")}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="text-[10px] text-white/25 uppercase tracking-wide">{label}</div>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
        <defs>
          <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3D7A6E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3D7A6E" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#sg-${label})`} />
        <path d={line} fill="none" stroke="#3D7A6E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ── Radial Credit Chart ───────────────────────────────────────────────────────

function CreditRadial({ used, remaining }: { used: number; remaining: number }) {
  const total = used + remaining;
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
  const r = 52, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-[130px] h-[130px]">
        <svg width={130} height={130} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={65} cy={65} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={10} />
          <circle cx={65} cy={65} r={r} fill="none" stroke="#3D7A6E" strokeWidth={10}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold text-white/92">{pct}%</span>
          <span className="text-[10px] text-white/25">remaining</span>
        </div>
      </div>
      <div className="flex gap-4 text-[11px]">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-teal-600 inline-block" />
          <span className="text-white/45">Remaining: <strong className="text-white/92">{fmtNum(remaining)}</strong></span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-white/15 inline-block" />
          <span className="text-white/45">Used: <strong className="text-white/92">{fmtNum(used)}</strong></span>
        </div>
      </div>
    </div>
  );
}

// ── Credit Action Panel ───────────────────────────────────────────────────────

function CreditActionPanel({ game, onAction }: { game: Game; onAction: (action: string, payload: object) => Promise<void> }) {
  const [tab, setTab] = useState<"gift" | "deduct" | "set_balance">("gift");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [exactBalance, setExactBalance] = useState("");
  const [confirm, setConfirm] = useState<{ tab: string; amount: number; reason: string; newBal: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const giftReasons = ["Promotion", "Creator Partnership", "Contest Reward", "Compensation", "Marketing Campaign", "Manual Bonus"];
  const deductReasons = ["Refund Adjustment", "Fraud Prevention", "Billing Correction", "Manual Adjustment", "Abuse Prevention"];

  const remaining = game.creditBudget?.remainingCredits;
  const amt = parseInt(amount) || 0;
  const newBal = tab === "gift" ? remaining + amt : tab === "deduct" ? Math.max(0, remaining - amt) : (parseInt(exactBalance) || 0);

  const handleConfirm = async () => {
    if (!confirm) return;
    setLoading(true);
    try {
      if (confirm.tab === "gift") await onAction("gift", { credits: confirm.amount, reason: confirm.reason });
      else if (confirm.tab === "deduct") await onAction("deduct", { credits: confirm.amount, reason: confirm.reason });
      else await onAction("set_balance", { balance: confirm.amount, reason: confirm.reason });
      setConfirm(null);
      setAmount(""); setReason(""); setExactBalance("");
    } finally { setLoading(false); }
  };

  const tabs: { key: "gift" | "deduct" | "set_balance"; label: string }[] = [
    { key: "gift", label: "Gift Credits" },
    { key: "deduct", label: "Deduct Credits" },
    { key: "set_balance", label: "Set Balance" },
  ];

  return (
    <>
      <div className="bg-gradient-to-br from-teal-900/25 to-black/60 border border-teal-600/[0.28] backdrop-blur-2xl rounded-2xl p-5">
        <div className="text-[13px] font-bold text-white/92 mb-4">Credit Action Center</div>
        <div className="flex gap-1.5 mb-4">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold cursor-pointer transition-all
                ${tab === t.key ? "bg-teal-900/40 border border-teal-600/[0.28] text-white/92" : "bg-transparent border border-transparent text-white/45 hover:text-white/70"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {(tab === "gift" || tab === "deduct") && (
          <div className="flex flex-col gap-2.5">
            <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount" />
            <Select value={reason} onChange={e => setReason(e.target.value)}
              options={[{ value: "", label: "Select reason…" }, ...(tab === "gift" ? giftReasons : deductReasons).map(r => ({ value: r, label: r }))]} />
            <div className="bg-white/5 border border-white/9 rounded-xl p-3 text-xs flex flex-col gap-1">
              <div className="flex justify-between text-white/45"><span>Current</span><span className="text-white/92">{fmtNum(remaining)}</span></div>
              <div className={`flex justify-between ${tab === "gift" ? "text-green-400" : "text-red-400"}`}>
                <span className="text-white/45">{tab === "gift" ? "Adding" : "Removing"}</span>
                <span>{tab === "gift" ? "+" : "-"}{fmtNum(amt)}</span>
              </div>
              <div className="flex justify-between border-t border-white/9 pt-1 font-bold text-white/92"><span>New Balance</span><span>{fmtNum(newBal)}</span></div>
            </div>
          </div>
        )}

        {tab === "set_balance" && (
          <div className="flex flex-col gap-2.5">
            <div className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2">
              ⚠ This directly affects monetization and game visibility.
            </div>
            <Input value={exactBalance} onChange={e => setExactBalance(e.target.value)} placeholder="New exact balance" />
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (required)" />
            <div className="bg-white/5 border border-white/9 rounded-xl p-3 text-xs flex justify-between text-white/45">
              <span>New Balance</span><span className="text-white/92 font-bold">{fmtNum(parseInt(exactBalance) || 0)}</span>
            </div>
          </div>
        )}

        <Btn variant="teal" onClick={() => {
          if (tab !== "set_balance" && !amt) return;
          if (tab === "set_balance" && !exactBalance) return;
          setConfirm({ tab, amount: tab === "set_balance" ? parseInt(exactBalance) : amt, reason, newBal });
        }} className="w-full mt-3 justify-center">Preview & Confirm</Btn>
      </div>

      {confirm && (
        <Modal title="Confirm Operation" onClose={() => setConfirm(null)}>
          <div className="text-[13px] text-white/50 mb-4">
            Perform <strong className="text-white/92">{confirm.tab.replace("_", " ").toUpperCase()}</strong> on <strong className="text-teal-400">{game.gameName}</strong>?
          </div>
          <div className="bg-white/5 border border-white/9 rounded-xl p-3 text-[13px] flex flex-col gap-1.5 mb-4">
            <div className="flex justify-between text-white/45"><span>Credits</span><span className="text-white/92">{fmtNum(confirm.amount)}</span></div>
            <div className="flex justify-between text-white/45"><span>New Balance</span><span className="text-white/92 font-bold">{fmtNum(confirm.newBal)}</span></div>
            <div className="flex justify-between text-white/45"><span>Reason</span><span className="text-white/92">{confirm.reason || "—"}</span></div>
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setConfirm(null)} className="flex-1 justify-center">Cancel</Btn>
            <Btn variant="teal" onClick={handleConfirm} disabled={loading} className="flex-1 justify-center">
              {loading ? "Confirming…" : "Confirm"}
            </Btn>
          </div>
        </Modal>
      )}
    </>
  );
}

// ── Visibility Panel — fix #8: conditional actions ────────────────────────────

function VisibilityPanel({ game, onAction }: { game: Game; onAction: (action: string, payload: object) => Promise<void> }) {
  const [confirm, setConfirm] = useState<{ key: string; label: string; variant: BtnVariant } | null>(null);
  const [loading, setLoading] = useState(false);

  const status = game.creditBudget?.status;
  const visibility = game.visibility || status;

  // fix #8: only show applicable actions
  const ops: { key: string; label: string; variant: BtnVariant }[] = [];
  if (visibility === "hidden") ops.push({ key: "unhide", label: "Unhide Game", variant: "teal" });
  if (visibility !== "hidden") ops.push({ key: "hide", label: "Hide Game", variant: "ghost" });
  if (status === "exhausted") ops.push({ key: "reactivate", label: "Reactivate Exhausted", variant: "amber" });

  if (!ops.length) return null;

  return (
    <div className="bg-gradient-to-br from-teal-900/25 to-black/60 border border-teal-600/[0.28] backdrop-blur-2xl rounded-2xl p-5">
      <div className="text-[13px] font-bold text-white/92 mb-4">Visibility Controls</div>
      <div className="flex flex-col gap-2">
        {ops.map(op => (
          <Btn key={op.key} variant={op.variant} onClick={() => setConfirm(op)} className="justify-between w-full">
            {op.label} <span className="opacity-50">→</span>
          </Btn>
        ))}
      </div>
      {confirm && (
        <Modal title={confirm.label} onClose={() => setConfirm(null)}>
          <div className="text-[13px] text-white/50 mb-5">
            Confirm <strong className="text-white/92">{confirm.label}</strong> on <strong className="text-teal-400">{game.gameName}</strong>?
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setConfirm(null)} className="flex-1 justify-center">Cancel</Btn>
            <Btn variant="teal" onClick={async () => {
              setLoading(true);
              try { await onAction(confirm.key, {}); setConfirm(null); }
              finally { setLoading(false); }
            }} disabled={loading} className="flex-1 justify-center">
              {loading ? "Working…" : "Confirm"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Game Drawer — fix #3 burn rate + #4 trends ────────────────────────────────

interface GameDrawerProps {
  game: Game;
  onClose: () => void;
  onActionSuccess: () => void;
  showToast: (msg: string, type: "ok" | "err") => void;
}

function GameDrawer({ game, onClose, onActionSuccess, showToast }: GameDrawerProps) {
  const [burnRate, setBurnRate] = useState<BurnRateData | null>(null);
  const [trends, setTrends] = useState<TrendPoint[]>([]);

  // fix #3 + #4: load burn rate and trends on mount
  useEffect(() => {
    apiFetch<BurnRateData>(`/game/${game._id}/burn-rate`).then(setBurnRate).catch(() => {});
    apiFetch<TrendPoint[]>(`/game/${game._id}/trends`).then(setTrends).catch(() => {});
  }, [game._id]);

  const handleAction = useCallback(async (action: string, payload: object) => {
    const endpointMap: Record<string, string> = {
      gift: "gift", deduct: "deduct", set_balance: "set-balance",
      hide: "hide", unhide: "unhide", reactivate: "reactivate",
    };
    const endpoint = endpointMap[action];
    if (!endpoint) return;
    try {
      await apiFetch(
        `/game/${game._id}/${endpoint}`,
        {
          method: "POST",
          data: payload,
        }
      );
      showToast(`${action} applied`, "ok");
      onActionSuccess();
    } catch (e: any) {
      showToast(e.message || "Action failed", "err");
    }
  }, [game._id, onActionSuccess, showToast]);

  // Trend windows for sparklines
  const today = new Date().toISOString().slice(0, 10);
  const d7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const trends7 = trends.filter(t => t._id >= d7);
  const trends30 = trends.filter(t => t._id >= d30);
  const trendsToday = trends.filter(t => t._id === today);

  return (
    <div className="fixed top-0 right-0 bottom-0 w-[420px] z-[200] bg-gradient-to-br from-teal-900/25 to-black/80 border-l border-teal-600/[0.28] backdrop-blur-2xl flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-white/9 flex justify-between items-center shrink-0">
        <div>
          <div className="font-bold text-[15px] text-white/92">{game.gameName}</div>
          <div className="text-[11px] text-white/45">{game.version ? `v${game.version} · ` : ""}{fmtDate(game.createdAt)}</div>
        </div>
        <button onClick={onClose} className="text-white/45 hover:text-white/80 bg-transparent border-none text-lg cursor-pointer">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        <CreditRadial used={game.creditBudget?.usedCredits} remaining={game.creditBudget?.remainingCredits} />

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-2">
          {([
            ["Sessions",       fmtNum(game.gameMetrics?.totalSessions)],
            ["Play Time",      fmtMs(game.gameMetrics?.totalSessionTimeMs)],
            ["Unique Players", fmtNum(game.gameMetrics?.uniquePlayers)],
            ["Avg Session",    fmtMs(game.gameMetrics?.avgSessionMs)],
            ["Purchased",      fmtNum(game.creditBudget?.totalPurchasedCredits)],
            ["Used",           fmtNum(game.creditBudget?.usedCredits)],
            ["Remaining",      fmtNum(game.creditBudget?.remainingCredits)],
            // fix #3: show real burn rate from API
            ["Burn/day",       burnRate ? fmtNum(Math.round(burnRate.averageDailyBurn)) : (game.burnRate ? fmtNum(game.burnRate) : "—")],
            ["Est. Days",      burnRate?.estimatedDaysRemaining != null ? String(burnRate.estimatedDaysRemaining) : "∞"],
            ["Burned 7d",      burnRate ? fmtNum(burnRate.burned7Days) : "—"],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="bg-white/5 border border-white/9 rounded-xl p-2.5">
              <div className="text-[10px] text-white/25 uppercase tracking-wide">{k}</div>
              <div className="text-[14px] font-bold text-white/92 mt-0.5">{v}</div>
            </div>
          ))}
        </div>

        {/* fix #4: Trend sparklines */}
        {trends.length > 0 && (
          <div className="bg-white/5 border border-white/9 rounded-2xl p-4 flex flex-col gap-4">
            <div className="text-[12px] font-bold text-white/92">Credit Consumption Trends</div>
            <MiniSparkline data={trendsToday.length ? trendsToday : [{ _id: today, credits: burnRate?.burnedToday || 0 }]} label="Today" />
            <MiniSparkline data={trends7} label="Last 7 Days" />
            <MiniSparkline data={trends30} label="Last 30 Days" />
          </div>
        )}

        <CreditActionPanel game={game} onAction={handleAction} />
        <VisibilityPanel game={game} onAction={handleAction} />
      </div>
    </div>
  );
}

// ── Games Table — fix #13 dynamic class ──────────────────────────────────────

function GamesTable({ games, onSelectGame, loading }: { games: Game[]; onSelectGame: (g: Game) => void; loading?: boolean }) {
  const cols = ["Game", "Status", "Remaining", "Used", "Purchased", "Sessions", "Play Time", "Visibility", "Actions"];
  if (loading) return (
    <div className="bg-white/5 border border-white/9 rounded-2xl overflow-hidden">
      <table className="w-full border-collapse text-xs">
        <thead><tr className="border-b border-white/9">{cols.map(c => <th key={c} className="px-3 py-2.5 text-left text-[10px] text-white/25 font-semibold uppercase tracking-widest">{c}</th>)}</tr></thead>
        <tbody>{[1,2,3].map(i => <SkeletonRow key={i} />)}</tbody>
      </table>
    </div>
  );
  return (
    <div className="bg-white/5 border border-white/9 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/9">
              {cols.map(c => <th key={c} className="px-3 py-2.5 text-left text-[10px] text-white/25 font-semibold uppercase tracking-widest whitespace-nowrap">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {games.map((g, i) => (
              <tr key={g._id} className={`border-b border-white/4 ${i % 2 ? "bg-white/[0.01]" : ""}`}>
                <td className="px-3 py-2.5 text-white/92 font-semibold whitespace-nowrap">{g.gameName}</td>
                <td className="px-3 py-2.5"><Pill status={g.creditBudget?.status } /></td>
                {/* fix #13: no dynamic class fragments */}
                <td className={`px-3 py-2.5 ${g.creditBudget?.remainingCredits < 100 ? "font-bold text-amber-400" : "font-normal text-white/92"}`}>
                  {fmtNum(g.creditBudget?.remainingCredits)}
                </td>
                <td className="px-3 py-2.5 text-white/45">{fmtNum(g.creditBudget?.usedCredits)}</td>
                <td className="px-3 py-2.5 text-white/45">{fmtNum(g.creditBudget?.totalPurchasedCredits)}</td>
                <td className="px-3 py-2.5 text-white/45">{fmtNum(g.gameMetrics?.totalSessions)}</td>
                <td className="px-3 py-2.5 text-white/45">{fmtMs(g.gameMetrics?.totalSessionTimeMs)}</td>
                <td className="px-3 py-2.5"><Pill status={g.visibility || g.creditBudget?.status } /></td>
                <td className="px-3 py-2.5">
                  <Btn variant="ghost" onClick={() => onSelectGame(g)} className="!py-1 !px-2.5">Manage</Btn>
                </td>
              </tr>
            ))}
            {games.length === 0 && (
              <tr><td colSpan={cols.length} className="px-3 py-8 text-center text-white/25">No games found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Creator Card ──────────────────────────────────────────────────────────────

function CreatorCard({ creator, isSelected, onSelect }: { creator: Creator; isSelected: boolean; onSelect: () => void }) {
  return (
    <div onClick={onSelect}
      className={`bg-white/5 border rounded-2xl p-4 cursor-pointer transition-all flex flex-col gap-2.5
        ${isSelected ? "border-teal-600/40 bg-teal-900/10" : "border-white/9 hover:border-teal-600/[0.28]"}`}>
      <div className="flex items-center gap-2.5">
        <img src={creator.avatar || `https://i.pravatar.cc/48?u=${creator._id}`} alt={creator.username}
          className="w-9 h-9 rounded-full border border-teal-600/[0.28] object-cover" />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-[13px] text-white/92 truncate">{creator.username}</div>
          <div className="text-[11px] text-white/45 truncate">{creator.email}</div>
        </div>
      </div>
      <div className="text-[11px] text-white/25">{fmtDate(creator.createdAt)}</div>
    </div>
  );
}

// ── Game Search Card (fix #1) ─────────────────────────────────────────────────

function GameSearchCard({ game, onSelect }: { game: Game; onSelect: (g: Game) => void }) {
  const status = game.creditBudget?.status;
  return (
    <div onClick={() => onSelect(game)}
      className="bg-white/5 border border-white/9 hover:border-teal-600/[0.28] rounded-2xl p-4 cursor-pointer transition-all flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="font-bold text-[13px] text-white/92 truncate">{game.gameName}</div>
        <Pill status={status} />
      </div>
      <div className="flex gap-3 text-[11px]">
        <span className="text-white/25">Remaining: <strong className={status === "exhausted" ? "text-red-400" : status === "low_credits" ? "text-amber-400" : "text-white/70"}>{fmtNum(game.creditBudget?.remainingCredits)}</strong></span>
        <span className="text-white/25">Sessions: <strong className="text-white/70">{fmtNum(game.gameMetrics?.totalSessions)}</strong></span>
      </div>
    </div>
  );
}

// ── Audit Log — fix #6 filters + #5 pagination ───────────────────────────────

interface AuditLogProps {
  creatorId?: string;
  gameId?: string;
  externalLogs?: AuditLog[];
  externalLoading?: boolean;
}

function AuditLogPanel({ creatorId, gameId, externalLogs, externalLoading }: AuditLogProps) {
  const [logs, setLogs] = useState<AuditLog[]>(externalLogs || []);
  const [loading, setLoading] = useState(externalLoading ?? false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<AuditFilters>({ action: "", creatorId: creatorId || "", gamePostId: gameId || "", page: 1 });
  const LIMIT = 25;

  const load = useCallback(async (f: AuditFilters) => {
    // If external logs provided, skip internal fetch
    if (externalLogs !== undefined) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), page: String(f.page) });
      if (f.action) params.set("action", f.action);
      if (f.creatorId) params.set("creatorId", f.creatorId);
      if (f.gamePostId) params.set("gamePostId", f.gamePostId);

      // If we have a creatorId context, use history endpoint
      if (creatorId && !f.action && !f.gamePostId) {
        const rows = await apiFetch<AuditLog[]>(`/creator/${creatorId}/history`);
        setLogs(rows);
        setTotal(rows.length);
      } else {
        const data = await apiFetch<{ rows: AuditLog[]; total: number }>(`/audit?${params}`);
        setLogs(data.rows);
        setTotal(data.total);
      }
    } catch {} finally { setLoading(false); }
  }, [creatorId, externalLogs]);

  useEffect(() => { load(filters); }, [filters]);

  // Sync external logs when provided
  useEffect(() => { if (externalLogs) setLogs(externalLogs); }, [externalLogs]);
  useEffect(() => { if (externalLoading !== undefined) setLoading(externalLoading); }, [externalLoading]);

  const pages = Math.ceil(total / LIMIT);

  const getAdminName = (a: AuditLog["admin"]) => typeof a === "object" ? a.username : String(a);
  const getGameName = (g: AuditLog["gamePost"]) => {
    if (typeof g === "object" && g !== null) return g["gamePost.gameName"] || g.gameName || "—";
    return "—";
  };
  const getCreatorName = (c: AuditLog["creator"]) => typeof c === "object" ? c.username : String(c);

  const actionOptions = [
    { value: "", label: "All Actions" },
    ...["gift","deduct","set_balance","consumption","purchase","hide","unhide","reactivate","refund"].map(a => ({ value: a, label: pillMap[a]?.label || a })),
  ];

  return (
    <div className="bg-white/5 border border-white/9 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/9 flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-bold text-white/92 flex-1">Audit Log</span>
        {/* fix #6: filters */}
        {externalLogs === undefined && (
          <>
            <Select value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value, page: 1 }))}
              options={actionOptions} className="!w-36 !py-1 !text-[11px]" />
            {!creatorId && (
              <input value={filters.creatorId} onChange={e => setFilters(f => ({ ...f, creatorId: e.target.value, page: 1 }))}
                placeholder="Creator ID…"
                className="bg-white/5 border border-white/9 rounded-lg px-2 py-1 text-[11px] text-white/92 placeholder-white/25 outline-none w-32" />
            )}
          </>
        )}
      </div>

      {loading ? (
        <div className="p-4">
          {[1,2,3,4].map(i => <div key={i} className="h-8 rounded-lg bg-white/[0.04] animate-pulse mb-2" />)}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/9">
                  {["Timestamp","Admin","Action","Game","Creator","Credits","Prev","New","Reason"].map(c => (
                    <th key={c} className="px-3 py-2 text-left text-[10px] text-white/25 font-semibold uppercase tracking-widest whitespace-nowrap">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l._id} className={`border-b border-white/4 ${i % 2 ? "bg-white/[0.01]" : ""}`}>
                    <td className="px-3 py-2 text-white/25 whitespace-nowrap">{fmtTime(l.createdAt)}</td>
                    <td className="px-3 py-2 text-teal-400 font-semibold">{getAdminName(l.admin)}</td>
                    <td className="px-3 py-2"><Pill status={l.action} /></td>
                    <td className="px-3 py-2 text-white/92">{getGameName(l.gamePost)}</td>
                    <td className="px-3 py-2 text-white/45">{getCreatorName(l.creator)}</td>
                    <td className={`px-3 py-2 font-bold ${l.credits > 0 ? "text-green-400" : "text-red-400"}`}>
                      {l.credits > 0 ? "+" : ""}{fmtNum(l.credits)}
                    </td>
                    <td className="px-3 py-2 text-white/45">{fmtNum(l.previousBalance)}</td>
                    <td className="px-3 py-2 text-white/92 font-semibold">{fmtNum(l.newBalance)}</td>
                    <td className="px-3 py-2 text-white/25 max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">{l.reason || "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={9} className="px-3 py-8 text-center text-white/25">No audit logs.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* fix #5: pagination */}
          {pages > 1 && (
            <div className="px-5 py-3 border-t border-white/9 flex items-center gap-2 justify-between">
              <span className="text-[11px] text-white/25">Page {filters.page} of {pages} · {total} entries</span>
              <div className="flex gap-1.5">
                <Btn variant="ghost" disabled={filters.page <= 1} onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} className="!py-1 !px-2.5">←</Btn>
                <Btn variant="ghost" disabled={filters.page >= pages} onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} className="!py-1 !px-2.5">→</Btn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Alerts Banner ─────────────────────────────────────────────────────────────

function AlertsBanner({ alerts }: { alerts: Alert[] }) {
  const exhausted = alerts.filter(a => a.type === "exhausted");
  const low = alerts.filter(a => a.type === "low");
  const hidden = alerts.filter(a => a.type === "hidden");
  if (!alerts.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {exhausted.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-3.5 py-2.5 text-xs text-red-400 flex items-center gap-2">
          <span className="font-bold">⚠</span>
          {exhausted.length} game{exhausted.length > 1 ? "s" : ""} fully exhausted: {exhausted.map(a => a.gameName).join(", ")}
        </div>
      )}
      {low.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl px-3.5 py-2.5 text-xs text-amber-400 flex items-center gap-2">
          <span className="font-bold">⚡</span>
          {low.length} below 100 credits: {low.map(a => a.gameName).join(", ")}
        </div>
      )}
      {hidden.length > 0 && (
        <div className="bg-white/5 border border-white/9 rounded-xl px-3.5 py-2.5 text-xs text-white/45 flex items-center gap-2">
          <span>👁</span>
          {hidden.length} hidden: {hidden.map(a => a.gameName).join(", ")}
        </div>
      )}
    </div>
  );
}

// ── Creator Actions Panel (fix #9) ────────────────────────────────────────────

function CreatorActionsPanel({ creator, onActionSuccess, showToast }: { creator: Creator; onActionSuccess: () => void; showToast: (m: string, t: "ok" | "err") => void }) {
  const [modal, setModal] = useState<"gift" | "deduct" | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleBulk = async () => {
    if (!amount || !modal) return;
    setLoading(true);
    try {
      await apiFetch(
        `/creator/${creator._id}/${modal}`,
        {
          method: "POST",
          data: {
            credits: parseInt(amount),
            reason,
          },
        }
      );
      showToast(`Bulk ${modal} applied to all games`, "ok");
      onActionSuccess();
      setModal(null);
      setAmount(""); setReason("");
    } catch (e: any) {
      showToast(e.message || "Failed", "err");
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-gradient-to-br from-teal-900/25 to-black/60 border border-teal-600/[0.28] backdrop-blur-2xl rounded-2xl p-4">
      <div className="text-[12px] font-bold text-white/92 mb-3">Creator Actions</div>
      <div className="flex gap-2">
        <Btn variant="teal" onClick={() => setModal("gift")} className="flex-1 justify-center text-[11px]">Gift All Games</Btn>
        <Btn variant="danger" onClick={() => setModal("deduct")} className="flex-1 justify-center text-[11px]">Deduct All Games</Btn>
      </div>

      {modal && (
        <Modal title={modal === "gift" ? "Gift Credits — All Games" : "Deduct Credits — All Games"} onClose={() => setModal(null)}>
          <div className="text-[12px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-2 mb-3">
            ⚠ This will apply to every game under <strong>{creator.username}</strong>.
          </div>
          <div className="flex flex-col gap-2.5 mb-4">
            <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Credits amount" />
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason" />
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)} className="flex-1 justify-center">Cancel</Btn>
            <Btn variant="teal" onClick={handleBulk} disabled={loading || !amount} className="flex-1 justify-center">
              {loading ? "Applying…" : "Confirm"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CreditOperationsCenter() {
  // fix #1: search mode toggle
  const [searchMode, setSearchMode] = useState<"creator" | "game">("creator");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Creator[]>([]);
  const [gameSearchResults, setGameSearchResults] = useState<Game[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [creatorDetail, setCreatorDetail] = useState<CreatorDetail | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [previousState, setPreviousState] = useState<{
  selectedCreator: Creator | null;
  creatorDetail: CreatorDetail | null;
  games: Game[];
} | null>(null);

  const [toast, setToast] = useState<{ message: string; type: "ok" | "err" } | null>(null);
  const showToast = useCallback((message: string, type: "ok" | "err") => setToast({ message, type }), []);

  // fix #2: extract loadDashboard + loadAlerts so we can call them after actions
  const loadDashboard = useCallback(() => {
    setDashLoading(true);
    apiFetch<DashboardData>("/dashboard").then(setDashboard).catch(() => {}).finally(() => setDashLoading(false));
  }, []);

  const loadAlerts = useCallback(() => {
    apiFetch<Alert[]>("/alerts").then(setAlerts).catch(() => {});
  }, []);

  const loadGlobalAudit = useCallback(() => {
    setAuditLoading(true);
    apiFetch<{ rows: AuditLog[] }>("/audit?limit=25")
      .then(d => setAuditLogs(d.rows))
      .catch(() => {})
      .finally(() => setAuditLoading(false));
  }, []);


  const resetSearch = () => {
  // search
  setSearch("");
  setSearchResults([]);
  setGameSearchResults([]);
  setSearchLoading(false);

  // creator state
  setSelectedCreator(null);
  setCreatorDetail(null);
  setGames([]);
  setGamesLoading(false);

  // game drawer
  setSelectedGame(null);

  // back to default mode
  setSearchMode("creator");

  // restore global audit log
  loadGlobalAudit();
};


  useEffect(() => {
    loadDashboard();
    loadAlerts();
    loadGlobalAudit();
  }, []);

  // fix #11: poll alerts every 30s
  useEffect(() => {
    const t = setInterval(loadAlerts, 30000);
    return () => clearInterval(t);
  }, [loadAlerts]);

  // Debounced search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); setGameSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        if (searchMode === "creator") {
          const res = await apiFetch<Creator[]>(`/creators?query=${encodeURIComponent(search)}`);
          setSearchResults(res);
        } else {
          // fix #1: game search mode
          const res = await apiFetch<Game[]>(`/games/search?query=${encodeURIComponent(search)}`);
          setGameSearchResults(res);
        }
      } catch {} finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [search, searchMode]);

  const loadCreator = useCallback(async (creator: Creator) => {
    setSelectedCreator(creator);
    setGamesLoading(true);
    try {
      const [detail, gameList] = await Promise.all([
        apiFetch<CreatorDetail>(`/creator/${creator._id}`),
        apiFetch<Game[]>(`/games?creatorId=${creator._id}`),
      ]);
      setCreatorDetail(detail);
      setGames(gameList);
      setAuditLoading(true);
      const auditData = await apiFetch<AuditLog[]>(`/creator/${creator._id}/history`);
      setAuditLogs(auditData);
    } catch (e: any) {
      showToast(e.message || "Failed to load creator", "err");
    } finally { setGamesLoading(false); setAuditLoading(false); }
  }, [showToast]);

  const handleSelectCreator = (creator: Creator) => {
    if (selectedCreator?._id === creator._id) {
      setSelectedCreator(null); setCreatorDetail(null); setGames([]);
      loadGlobalAudit();
    } else { loadCreator(creator); }
  };

  // fix #2 + #7: optimistic update then sync, refresh dashboard+alerts after actions
  const handleActionSuccess = useCallback(() => {
    if (selectedGame && selectedCreator) {
      // fix #7: optimistic — placeholder update before fetch
      const optimistic = {
        ...selectedGame,
        creditBudget: { ...selectedGame.creditBudget, remainingCredits: selectedGame.creditBudget?.remainingCredits },
      };
      setGames(prev => prev.map(g => g._id === optimistic._id ? optimistic : g));

      // Then sync real data
      apiFetch<Game>(`/game/${selectedGame._id}`)
        .then(updated => {
          setGames(prev => prev.map(g => g._id === updated._id ? updated : g));
          setSelectedGame(updated);
        })
        .catch(() => {});
      apiFetch<AuditLog[]>(`/creator/${selectedCreator._id}/history`).then(setAuditLogs).catch(() => {});
    }
    // fix #2: refresh dashboard + alerts after every action
    loadDashboard();
    loadAlerts();
  }, [selectedGame, selectedCreator, loadDashboard, loadAlerts]);

  const summary = creatorDetail?.summary;

  return (
    <div className="min-h-screen bg-[#111] text-white/92 p-6">
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}


      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-1 h-7 rounded-sm bg-teal-600" />
          <h1 className="text-[22px] font-extrabold text-white/92 m-0">Credit Operations Center</h1>
        </div>
        <p className="text-[13px] text-white/45 m-0 pl-3.5">Manage creator monetization, game credits, billing, visibility, and operational health.</p>
      </div>

      {/* KPI Cards — fix #12: skeletons while loading */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 mb-6">
        {dashLoading ? (
          [1,2,3,4,5,6,7].map(i => <SkeletonCard key={i} h="h-20" />)
        ) : dashboard ? (
          <>
            <KpiCard label="Active Games"      value={dashboard.totalActiveGames} />
            <KpiCard label="Low Credits"       value={dashboard.lowCreditGames}   accent={dashboard.lowCreditGames > 0 ? "text-amber-400" : undefined} />
            <KpiCard label="Exhausted"         value={dashboard.exhaustedGames}   accent={dashboard.exhaustedGames > 0 ? "text-red-400" : undefined} />
            <KpiCard label="Credits Remaining" value={fmtNum(dashboard.totalCreditsRemaining)} accent="text-teal-400" />
            <KpiCard label="Consumed Today"    value={fmtNum(dashboard.creditsConsumedToday)} />
            <KpiCard label="Gifted Today"      value={fmtNum(dashboard.creditsGiftedToday)}    accent={dashboard.creditsGiftedToday > 0 ? "text-green-400" : undefined} />
            <KpiCard label="Deducted Today"    value={fmtNum(dashboard.creditsDeductedToday)}  accent={dashboard.creditsDeductedToday > 0 ? "text-red-400" : undefined} />
          </>
        ) : null}
      </div>

      {alerts.length > 0 && <div className="mb-5"><AlertsBanner alerts={alerts} /></div>}

      {/* Layout */}
      <div className={`grid gap-5 items-start ${selectedCreator ? "grid-cols-[300px_1fr]" : "grid-cols-1"}`}>
        {/* Left: Search */}
        <div className="flex flex-col gap-3">
          {/* fix #1: mode toggle */}
          <div className="flex gap-1 bg-white/5 border border-white/9 rounded-xl p-1">
            {(["creator","game"] as const).map(m => (
              <button key={m} onClick={() => { setSearchMode(m); setSearch(""); setSearchResults([]); setGameSearchResults([]); }}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer transition-all capitalize
                  ${searchMode === m ? "bg-teal-900/40 border border-teal-600/[0.28] text-white/92" : "text-white/45 hover:text-white/70 border border-transparent"}`}>
                {m === "creator" ? "Creators" : "Games"}
              </button>
            ))}
          </div>

         <div className="flex gap-2">
  <Input
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    placeholder={
      searchMode === "creator"
        ? "Search by username or email..."
        : "Search game by name..."
    }
  />

  {(search ||
    selectedCreator ||
    selectedGame ||
    gameSearchResults.length > 0 ||
    searchResults.length > 0) && (
    <Btn
      variant="ghost"
      onClick={resetSearch}
      className="shrink-0"
    >
      ✕ Reset
    </Btn>
  )}
</div>
          {searchLoading && (
            <div className="flex flex-col gap-2">
              {[1,2].map(i => <SkeletonCard key={i} h="h-20" />)}
            </div>
          )}

          {/* fix #1: game search results open drawer directly */}
          {searchMode === "game" && gameSearchResults.map(g => (
            <GameSearchCard
  key={g._id}
  game={g}
  onSelect={(game) => {
    setPreviousState({
      selectedCreator,
      creatorDetail,
      games,
    });

    setSelectedGame(game);
  }}
/>
          ))}

          {searchMode === "creator" && (
            <div className="flex flex-col gap-2">
              {searchResults.map(c => (
                <CreatorCard key={c._id} creator={c} isSelected={selectedCreator?._id === c._id} onSelect={() => handleSelectCreator(c)} />
              ))}
              {!searchLoading && search && searchResults.length === 0 && (
                <div className="text-[13px] text-white/25 text-center py-8">No creators found.</div>
              )}
              {!search && <div className="text-[12px] text-white/25 text-center py-4">Type to search…</div>}
            </div>
          )}
        </div>

        {/* Right: Creator Detail or global audit */}
        {selectedCreator ? (
          <div className="flex flex-col gap-5">
            {creatorDetail ? (
              <div className="bg-gradient-to-br from-teal-900/25 to-black/60 border border-teal-600/[0.28] backdrop-blur-2xl rounded-2xl p-5 flex flex-wrap items-center gap-4">
                <img src={selectedCreator.avatar || `https://i.pravatar.cc/48?u=${selectedCreator._id}`} alt={selectedCreator.username}
                  className="w-12 h-12 rounded-full border-2 border-teal-600/30 object-cover shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-extrabold text-[16px] text-white/92">{selectedCreator.username}</div>
                  <div className="text-[12px] text-white/45">{selectedCreator.email}</div>
                  <div className="text-[11px] text-white/25">Joined {fmtDate(selectedCreator.createdAt)}</div>
                </div>
                {summary && (
                  <div className="flex gap-2 flex-wrap">
                    {([
                      ["Games",     summary.totalGames],
                      ["Sessions",  fmtNum(summary.totalSessions)],
                      ["Purchased", fmtNum(summary.totalCreditsPurchased)],
                      ["Consumed",  fmtNum(summary.totalCreditsConsumed)],
                      ["Remaining", fmtNum(summary.remainingCredits)],
                    ] as [string, string | number][]).map(([k, v]) => (
                      <div key={k} className="bg-white/5 border border-white/9 rounded-xl px-3 py-1.5 text-center">
                        <div className="text-[10px] text-white/25">{k}</div>
                        <div className="text-[14px] font-bold text-white/92">{v}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : <SkeletonCard h="h-24" />}

            {/* fix #9: creator-level actions */}
            <CreatorActionsPanel creator={selectedCreator} onActionSuccess={handleActionSuccess} showToast={showToast} />

            <GamesTable games={games} onSelectGame={setSelectedGame} loading={gamesLoading} />
            <AuditLogPanel externalLogs={auditLogs} externalLoading={auditLoading} creatorId={selectedCreator._id} />
          </div>
        ) : (
          <div className="col-span-full">
            <AuditLogPanel />
          </div>
        )}
      </div>

      {/* Game Drawer */}
      {selectedGame && (
        <GameDrawer
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          onActionSuccess={handleActionSuccess}
          showToast={showToast}
        />
      )}
    </div>
  );
}