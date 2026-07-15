import { useState, useEffect, useCallback } from "react";
import axios, { AxiosRequestConfig } from "axios";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Creator {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  isVerified?: boolean;
}

interface Sponsorship {
  status: "pending" | "approved" | "rejected";
  enabled: boolean;
  initialCredits: number;
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  rejectionReason?: string;
}

interface GamePostDraft {
  _id: string;
  creator: Creator;
  description?: string;
  game: {
    gameName: string;
    version?: string;
    engine?: string;
    maxSessionDurationMinutes?: number;
    sponsorship: Sponsorship;
  };
  buildFile?: string;
  videoDemo?: {
    thumbnailUrl?: string;
    optimizedUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  status: string;
}

interface DashboardData {
  queue: {
    pendingReviews: number;
    approvedWaiting: number;
    rejected: number;
    failedPublishing: number;
  };
  lifetime: {
    totalSponsoredGames: number;
    liveSponsoredGames: number;
    hiddenSponsoredGames: number;
    totalSponsoredCreditsGifted: number;
    totalSponsoredCreditsConsumed: number;
    sponsoredCreditsRemaining: number;
    totalCreditsPurchased: number;
    totalPurchaseRevenue: number;
    totalPaidGames: number;
    avgGiftCreditsPerSponsoredGame: number;
    avgPurchasedCreditsPerPaidGame: number;
  };
}

// ── API ───────────────────────────────────────────────────────────────────────

const BASE = `${import.meta.env.VITE_BACKEND_URL}/api/admin/sponsored-games`;

async function apiFetch<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const { data } = await axios({
    url: `${BASE}${path}`,
    withCredentials: true,
    ...config,
  });
  return data;
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmtNum = (n?: number) => (n ?? 0).toLocaleString("en-IN");
const fmtCurrency = (n?: number) => n ? `$${(n / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "$0.00"; // Assuming amount is stored in cents/paise
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (d?: string) =>
  d ? new Date(d).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }) : "—";

// ── UI Components ─────────────────────────────────────────────────────────────

const pillMap: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Pending",  cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  approved: { label: "Approved", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
  rejected: { label: "Rejected", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  enabled:  { label: "Sponsored", cls: "bg-teal-600/15 text-teal-400 border-teal-600/30" },
};

function Pill({ status }: { status: string }) {
  const s = pillMap[status] || { label: status, cls: "bg-white/[0.08] text-white/50 border-white/[0.15]" };
  return (
    <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${s.cls}`}>
      {s.label}
    </span>
  );
}

function SkeletonCard({ h = "h-16" }: { h?: string }) {
  return <div className={`${h} rounded-2xl bg-white/5 border border-white/9 animate-pulse`} />;
}

function SkeletonRow() {
  return (
    <tr className="border-b border-white/4">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => (
        <td key={i} className="px-3 py-2.5">
          <div className="h-3 rounded bg-white/[0.07] animate-pulse" style={{ width: `${40 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className="bg-white/5 border border-white/9 backdrop-blur-lg rounded-2xl p-4 flex flex-col gap-1.5">
      <span className="text-[11px] text-white/45 font-semibold uppercase tracking-widest">{label}</span>
      <span className={`text-[22px] font-bold leading-none ${accent || "text-white/92"}`}>{value}</span>
      {sub && <span className="text-[11px] text-white/25">{sub}</span>}
    </div>
  );
}

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

function Input({ value, onChange, placeholder, className = "", type = "text" }: {
  value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; className?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full bg-white/5 border border-white/9 rounded-xl px-3 py-2 text-[13px] text-white/92 placeholder-white/25 outline-none focus:border-teal-600/50 transition-colors ${className}`}
    />
  );
}

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
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

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

function Toast({ message, type, onDone }: { message: string; type: "ok" | "err"; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className={`fixed bottom-6 right-6 z-[2000] px-4 py-3 rounded-xl text-sm font-semibold border backdrop-blur-lg shadow-2xl
      ${type === "ok" ? "bg-green-500/15 border-green-500/30 text-green-400" : "bg-red-500/15 border-red-500/30 text-red-400"}`}>
      {message}
    </div>
  );
}

// ── Game Drawer ───────────────────────────────────────────────────────────────

function DraftDrawer({ draft, onClose, onActionSuccess, showToast }: {
  draft: GamePostDraft;
  onClose: () => void;
  onActionSuccess: () => void;
  showToast: (msg: string, type: "ok" | "err") => void;
}) {
  const [modalType, setModalType] = useState<"approve" | "reject" | "reset" | null>(null);
  const [credits, setCredits] = useState("");
  const [notes, setNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (modalType === "approve") {
        await apiFetch(`/${draft._id}/approve`, { method: "POST", data: { credits: Number(credits), notes } });
        showToast("Sponsorship approved", "ok");
      } else if (modalType === "reject") {
        await apiFetch(`/${draft._id}/reject`, { method: "POST", data: { rejectionReason } });
        showToast("Sponsorship rejected", "ok");
      } else if (modalType === "reset") {
        await apiFetch(`/${draft._id}/reset`, { method: "POST" });
        showToast("Sponsorship reset to pending", "ok");
      }
      onActionSuccess();
      setModalType(null);
      onClose();
    } catch (e: any) {
      showToast(e.response?.data?.message || e.message || "Action failed", "err");
    } finally {
      setLoading(false);
    }
  };

  const isPending = draft.game?.sponsorship?.status === "pending";

  return (
    <div className="fixed top-0 right-0 bottom-0 w-[460px] z-[200] bg-gradient-to-br from-teal-900/25 to-black/80 border-l border-teal-600/[0.28] backdrop-blur-2xl flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b border-white/9 flex justify-between items-center shrink-0">
        <div>
          <div className="font-bold text-[15px] text-white/92">{draft.game.gameName}</div>
          <div className="text-[11px] text-white/45">By {draft.creator.username} · {fmtDate(draft.createdAt)}</div>
        </div>
        <button onClick={onClose} className="text-white/45 hover:text-white/80 bg-transparent border-none text-lg cursor-pointer">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        {/* Media Preview */}
        {draft.videoDemo?.optimizedUrl ? (
          <video controls poster={draft.videoDemo.thumbnailUrl} className="w-full rounded-xl border border-white/9" src={draft.videoDemo.optimizedUrl} />
        ) : draft.videoDemo?.thumbnailUrl ? (
          <img src={draft.videoDemo.thumbnailUrl} alt="Thumbnail" className="w-full rounded-xl border border-white/9 object-cover aspect-video" />
        ) : (
          <div className="w-full aspect-video rounded-xl bg-white/5 border border-white/9 flex items-center justify-center text-white/25 text-xs">No media available</div>
        )}

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-2">
          {([
            ["Status", <Pill status={draft.game?.sponsorship?.status} />],
            ["Version", draft.game?.version || "—"],
            ["Engine", draft.game?.engine || "—"],
            ["Max Session", `${draft.game?.maxSessionDurationMinutes || 0} min`],
            ["Credits Requested", fmtNum(draft.game?.sponsorship?.initialCredits)],
            ["Draft Status", draft.status],
          ] as [string, React.ReactNode][]).map(([k, v]) => (
            <div key={k} className="bg-white/5 border border-white/9 rounded-xl p-3">
              <div className="text-[10px] text-white/25 uppercase tracking-wide mb-1">{k}</div>
              <div className="text-[13px] font-bold text-white/92">{v}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div className="bg-white/5 border border-white/9 rounded-xl p-4 text-[12px] text-white/70">
          <strong className="text-white/92 block mb-1">Description</strong>
          {draft.description || "No description provided."}
        </div>

        {/* Sponsor Notes / Rejection Reason */}
        {draft.game?.sponsorship?.notes && (
          <div className="bg-teal-900/20 border border-teal-600/30 rounded-xl p-4 text-[12px] text-teal-100">
            <strong className="text-teal-400 block mb-1">Approval Notes (Reviewed {fmtDate(draft.game?.sponsorship?.reviewedAt)})</strong>
            {draft.game?.sponsorship?.notes}
          </div>
        )}
        {draft.game?.sponsorship?.rejectionReason && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-[12px] text-red-200">
            <strong className="text-red-400 block mb-1">Rejection Reason (Reviewed {fmtDate(draft.game?.sponsorship?.reviewedAt)})</strong>
            {draft.game?.sponsorship?.rejectionReason}
          </div>
        )}

        {/* Actions */}
        <div className="bg-gradient-to-br from-teal-900/25 to-black/60 border border-teal-600/[0.28] backdrop-blur-2xl rounded-2xl p-5 mt-auto">
          <div className="text-[13px] font-bold text-white/92 mb-4">Sponsorship Actions</div>
          <div className="flex flex-col gap-2">
            <Btn variant="teal" onClick={() => setModalType("approve")} disabled={!isPending} className="justify-center w-full">Approve Sponsorship</Btn>
            <Btn variant="danger" onClick={() => setModalType("reject")} disabled={!isPending} className="justify-center w-full">Reject Request</Btn>
            {!isPending && (
              <Btn variant="ghost" onClick={() => setModalType("reset")} className="justify-center w-full mt-2 border-dashed">Reset to Pending</Btn>
            )}
          </div>
        </div>
      </div>

      {/* Action Modals */}
      {modalType === "approve" && (
        <Modal title="Approve Sponsorship" onClose={() => setModalType(null)}>
          <div className="flex flex-col gap-3 mb-4">
            <label className="text-[11px] text-white/45">Granted Credits</label>
            <Input type="number" value={credits} onChange={(e) => setCredits(e.target.value)} placeholder="e.g. 5000" />
            <label className="text-[11px] text-white/45 mt-2">Internal Notes (Optional)</label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Terms or notes for approval..." />
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModalType(null)} className="flex-1 justify-center">Cancel</Btn>
            <Btn variant="teal" onClick={handleAction} disabled={loading || !credits} className="flex-1 justify-center">
              {loading ? "Approving..." : "Approve"}
            </Btn>
          </div>
        </Modal>
      )}

      {modalType === "reject" && (
        <Modal title="Reject Sponsorship" onClose={() => setModalType(null)}>
          <div className="flex flex-col gap-3 mb-4">
            <label className="text-[11px] text-white/45">Rejection Reason</label>
            <textarea 
              value={rejectionReason} 
              onChange={(e) => setRejectionReason(e.target.value)} 
              placeholder="Why is this being rejected?"
              className="w-full bg-white/5 border border-white/9 rounded-xl px-3 py-2 text-[13px] text-white/92 placeholder-white/25 outline-none focus:border-red-500/50 min-h-[100px]"
            />
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModalType(null)} className="flex-1 justify-center">Cancel</Btn>
            <Btn variant="danger" onClick={handleAction} disabled={loading || !rejectionReason.trim()} className="flex-1 justify-center">
              {loading ? "Rejecting..." : "Reject"}
            </Btn>
          </div>
        </Modal>
      )}

      {modalType === "reset" && (
        <Modal title="Reset Sponsorship?" onClose={() => setModalType(null)}>
          <div className="text-[13px] text-white/70 mb-5">
            This will clear approval status, remove granted credits, and set the draft back to <strong className="text-amber-400">Pending</strong>.
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModalType(null)} className="flex-1 justify-center">Cancel</Btn>
            <Btn variant="amber" onClick={handleAction} disabled={loading} className="flex-1 justify-center">
              {loading ? "Resetting..." : "Reset to Pending"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SponsoredGamesAdmin() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(true);

  const [drafts, setDrafts] = useState<GamePostDraft[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [selectedDraft, setSelectedDraft] = useState<GamePostDraft | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "ok" | "err" } | null>(null);

  const showToast = useCallback((message: string, type: "ok" | "err") => setToast({ message, type }), []);

  const loadDashboard = useCallback(() => {
    setDashLoading(true);
    apiFetch<DashboardData>("/dashboard")
      .then(setDashboard)
      .catch(() => showToast("Failed to load dashboard metrics", "err"))
      .finally(() => setDashLoading(false));
  }, [showToast]);

  const loadDrafts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.append("search", search);
    if (statusFilter) params.append("status", statusFilter);

    apiFetch<{ rows: GamePostDraft[]; pages: number }>(`/?${params.toString()}`)
      .then((res) => {
        setDrafts(res.rows);
        setTotalPages(res.pages);
      })
      .catch(() => showToast("Failed to load sponsored games", "err"))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, showToast]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Debounced search trigger
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      loadDrafts();
    }, 400);
    return () => clearTimeout(t);
  }, [search, statusFilter, loadDrafts]);

  const handleActionSuccess = () => {
    loadDashboard();
    loadDrafts();
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  return (
    <div className="min-h-screen bg-[#111] text-white/92 p-6">
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-1 h-7 rounded-sm bg-teal-600" />
          <h1 className="text-[22px] font-extrabold text-white/92 m-0">Sponsored Games Admin</h1>
        </div>
        <p className="text-[13px] text-white/45 m-0 pl-3.5">Manage game drafts, sponsorship requests, and view lifetime analytics.</p>
      </div>

      {/* Queue Dashboards (Row 1) */}
      <div className="grid grid-cols-4 gap-2.5 mb-2.5">
        {dashLoading ? (
          [1, 2, 3, 4].map((i) => <SkeletonCard key={i} h="h-20" />)
        ) : dashboard ? (
          <>
            <KpiCard label="Pending Reviews" value={dashboard.queue.pendingReviews} accent="text-amber-400" />
            <KpiCard label="Approved Waiting" value={dashboard.queue.approvedWaiting} accent="text-green-400" />
            <KpiCard label="Rejected" value={dashboard.queue.rejected} accent="text-red-400" />
            <KpiCard label="Failed Publishing" value={dashboard.queue.failedPublishing} />
          </>
        ) : null}
      </div>

      {/* Lifetime Analytics (Row 2) */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5 mb-6">
        {dashLoading ? (
          [1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} h="h-20" />)
        ) : dashboard ? (
          <>
            <KpiCard label="Total Sponsored Games" value={fmtNum(dashboard.lifetime.totalSponsoredGames)} />
            <KpiCard label="Gifted Credits" value={fmtNum(dashboard.lifetime.totalSponsoredCreditsGifted)} accent="text-teal-400" />
            <KpiCard label="Credits Consumed" value={fmtNum(dashboard.lifetime.totalSponsoredCreditsConsumed)} />
            <KpiCard label="Credits Remaining" value={fmtNum(dashboard.lifetime.sponsoredCreditsRemaining)} />
            <KpiCard label="Purchased Credits" value={fmtNum(dashboard.lifetime.totalCreditsPurchased)} />
            <KpiCard label="Revenue" value={fmtCurrency(dashboard.lifetime.totalPurchaseRevenue)} accent="text-green-400" />
          </>
        ) : null}
      </div>

      {/* Filters & Table */}
      <div className="bg-white/5 border border-white/9 rounded-2xl overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="px-5 py-4 border-b border-white/9 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full max-w-md">
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, username, or email..." className="flex-1" />
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} options={statusOptions} className="!w-40" />
          </div>
          <Btn variant="ghost" onClick={loadDrafts} disabled={loading}>Refresh</Btn>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/9">
                {["Thumbnail", "Game", "Creator", "Version", "Engine", "Session Length", "Sponsor Status", "Gifted Credits", "Draft Status", "Uploaded", "Actions"].map((c) => (
                  <th key={c} className="px-3 py-3 text-left text-[10px] text-white/25 font-semibold uppercase tracking-widest whitespace-nowrap">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)
              ) : drafts.length > 0 ? (
                drafts.map((d, i) => (
                  <tr key={d._id} className={`border-b border-white/4 hover:bg-white/[0.02] transition-colors ${i % 2 ? "bg-white/[0.01]" : ""}`}>
                    <td className="px-3 py-2.5">
                      <img src={d.videoDemo?.thumbnailUrl || "/placeholder.jpg"} alt={d.game.gameName} className="w-10 h-10 rounded-lg object-cover border border-white/9" />
                    </td>
                    <td className="px-3 py-2.5 text-white/92 font-semibold whitespace-nowrap">
                      {d.game.gameName}
                      {d.game?.sponsorship?.enabled && <span className="ml-2"><Pill status="enabled" /></span>}
                    </td>
                    <td className="px-3 py-2.5 text-white/70 whitespace-nowrap">
                      <div>{d.creator.username}</div>
                      <div className="text-[10px] text-white/45">{d.creator.email}</div>
                    </td>
                    <td className="px-3 py-2.5 text-white/45">{d.game.version || "—"}</td>
                    <td className="px-3 py-2.5 text-white/45">{d.game.engine || "—"}</td>
                    <td className="px-3 py-2.5 text-white/45">{d.game?.maxSessionDurationMinutes ? `${d.game?.maxSessionDurationMinutes}m` : "—"}</td>
                    <td className="px-3 py-2.5"><Pill status={d.game?.sponsorship?.status} /></td>
                    <td className={`px-3 py-2.5 ${d.game?.sponsorship?.initialCredits > 0 ? "font-bold text-teal-400" : "text-white/45"}`}>
                      {fmtNum(d.game?.sponsorship?.initialCredits)}
                    </td>
                    <td className="px-3 py-2.5 text-white/45 capitalize">{d.status}</td>
                    <td className="px-3 py-2.5 text-white/45">{fmtDate(d.createdAt)}</td>
                    <td className="px-3 py-2.5">
                      <Btn variant="ghost" onClick={() => setSelectedDraft(d)} className="!py-1 !px-2.5">Review</Btn>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-3 py-12 text-center text-white/25">No sponsored games found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-5 py-3 border-t border-white/9 flex items-center gap-2 justify-between">
            <span className="text-[11px] text-white/25">Page {page} of {totalPages}</span>
            <div className="flex gap-1.5">
              <Btn variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="!py-1 !px-2.5">← Prev</Btn>
              <Btn variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="!py-1 !px-2.5">Next →</Btn>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      {selectedDraft && (
        <DraftDrawer
          draft={selectedDraft}
          onClose={() => setSelectedDraft(null)}
          onActionSuccess={handleActionSuccess}
          showToast={showToast}
        />
      )}
    </div>
  );
}