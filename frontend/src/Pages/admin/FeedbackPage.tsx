import { useEffect, useState, useCallback, useRef } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

interface Feedback {
    _id: string;
    category: string;
    message: string;
    createdAt: string;
    user: {
        displayName: string;
        username: string;
        avatar?: string;
        email: string;
    };
}

export default function FeedbackPage() {
    const [feedback, setFeedback] = useState<Feedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const fetchFeedback = async (pageNumber: number) => {
        // Prevent duplicate fetches if already loading
        if ((pageNumber > 1 && loadingMore) || !hasMore) return;

        if (pageNumber === 1) setLoading(true);
        else setLoadingMore(true);

        try {
            const res = await fetch(
                `${BACKEND_URL}/api/v1/feedback?page=${pageNumber}`,
                { credentials: "include" }
            );

            const data = await res.json();

            setFeedback((prev) => {
                if (pageNumber === 1) return data.feedback;
                
                const existingIds = new Set(prev.map((p) => p._id));
                const filtered = data.feedback.filter(
                    (f: Feedback) => !existingIds.has(f._id)
                );
                return [...prev, ...filtered];
            });

            setHasMore(data.hasMore);
        } catch (err) {
            console.error("Failed to fetch feedback:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Single source of truth for handling initial and subsequent page fetches
    useEffect(() => {
        fetchFeedback(page);
    }, [page]);

    const observer = useRef<IntersectionObserver | null>(null);

    const lastFeedbackRef = useCallback(
        (node: HTMLDivElement | null) => {
            if (loadingMore || loading) return;

            if (observer.current) observer.current.disconnect();

            observer.current = new IntersectionObserver((entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore && feedback.length > 0) {
                    setPage((prev) => prev + 1);
                }
            });

            if (node) observer.current.observe(node);
        },
        [hasMore, loadingMore, loading, feedback.length]
    );

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 antialiased selection:bg-red-500/30 selection:text-red-200">
            <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="flex flex-col gap-1 mb-10 border-b border-zinc-800 pb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                        User Feedback
                    </h1>
                    <p className="text-sm text-zinc-400">
                        Review submissions and ideas sent in by the community.
                    </p>
                </div>

                {/* Main Content Area */}
                <div className="space-y-4">
                    {loading ? (
                        // Initial Skeleton Loader Grid
                        Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
                    ) : feedback.length === 0 ? (
                        // Empty State
                        <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
                            <p className="text-zinc-400 font-medium">No feedback found</p>
                            <p className="text-xs text-zinc-500 mt-1">Check back later for new items.</p>
                        </div>
                    ) : (
                        // Feedback List
                        feedback.map((item, index) => (
                            <div
                                key={item._id}
                                ref={index === feedback.length - 1 ? lastFeedbackRef : null}
                                className="group relative rounded-2xl bg-[#121212] border border-zinc-800/80 p-6 transition-all duration-200 hover:border-zinc-700 hover:bg-[#151515] hover:shadow-xl hover:shadow-black/40"
                            >
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={item.user.avatar || "/default-avatar.png"}
                                            alt={item.user.displayName}
                                            className="w-11 h-11 rounded-full object-cover ring-2 ring-zinc-800 group-hover:ring-zinc-700 transition-colors"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = "/default-avatar.png";
                                            }}
                                        />
                                        <div>
                                            <p className="font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug">
                                                {item.user.displayName}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-x-2 text-xs text-zinc-400 mt-0.5">
                                                <span>@{item.user.username}</span>
                                                <span className="text-zinc-600">•</span>
                                                <span className="text-zinc-500">{item.user.email}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <span className="inline-flex items-center rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/20">
                                        {item.category}
                                    </span>
                                </div>

                                <p className="text-zinc-300 text-[15px] leading-relaxed whitespace-pre-wrap break-words pl-0 sm:pl-14">
                                    {item.message}
                                </p>

                                <div className="mt-4 pt-3 border-t border-zinc-900 flex justify-end pl-0 sm:pl-14">
                                    <p className="text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                                        {new Date(item.createdAt).toLocaleString(undefined, {
                                            dateStyle: 'medium',
                                            timeStyle: 'short'
                                        })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Infinite Scroll / Loading More Spinner */}
                {loadingMore && (
                    <div className="flex justify-center items-center py-10">
                        <div className="flex flex-col items-center gap-2">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-red-500" />
                            <span className="text-xs font-medium text-zinc-400">Loading more submissions...</span>
                        </div>
                    </div>
                )}

                {/* End of Content Marker */}
                {!hasMore && feedback.length > 0 && (
                    <p className="text-center text-xs text-zinc-600 font-medium py-12 tracking-wide">
                        You've reached the end of the line 🎉
                    </p>
                )}
            </div>
        </div>
    );
}

// Separate Presentational Component for cleaner code layout
function SkeletonCard() {
    return (
        <div className="rounded-2xl bg-[#121212]/60 border border-zinc-800/60 p-6 animate-pulse">
            <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-3 w-full">
                    <div className="w-11 h-11 rounded-full bg-zinc-800" />
                    <div className="space-y-2 flex-1 max-w-[250px]">
                        <div className="h-4 bg-zinc-800 rounded w-3/4" />
                        <div className="h-3 bg-zinc-800/60 rounded w-1/2" />
                    </div>
                </div>
                <div className="h-6 bg-zinc-800 rounded w-16" />
            </div>
            <div className="space-y-2 mt-4 pl-0 sm:pl-14">
                <div className="h-3.5 bg-zinc-800 rounded w-full" />
                <div className="h-3.5 bg-zinc-800 rounded w-5/6" />
            </div>
            <div className="mt-4 pt-3 flex justify-end pl-0 sm:pl-14">
                <div className="h-3 bg-zinc-800/40 rounded w-24" />
            </div>
        </div>
    );
}