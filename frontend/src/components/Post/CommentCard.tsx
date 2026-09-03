import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/user";
import { Link as LinkIcon, MoreHorizontal, Trash2 } from "lucide-react";
import MentionText from "./MentionText";
import ThreadReplies, { ThreadRepliesHandle } from "./ThreadReplies";
export interface LinkPreview {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
}

export interface Comment {
    _id: string;
    postId: string;
    text: string;
    createdAt: string;

    parentComment?: string | null;
    rootComment?: string | null;
    depth?: number;
    replyCount?: number;
    isDeleted?: boolean;

    user?: {
        _id: string;
        username: string;
        displayName?: string;
        avatar?: string;
    };
    review?: {
        isGameReview: boolean;

        feedback?: {
            overall?: number;
            playTimeMs?: number;
            suggestions?: string;
        };
    };
    mentions?: {
        user: {
            _id: string;
            username: string;
            displayName: string;
            avatar: string;
        };
        originalUsername: string;
    }[];
    hasPlayedDemo?: boolean;
}

interface CommentCardProps {
    comment: Comment;
    BACKEND_URL: string;
    postOwnerId: string;
    onDelete: (comment: Comment) => void;
    onReply: (comment: Comment) => void;
    showThreadReplies?: boolean;
    linkPreviewCache?: React.MutableRefObject<Record<string, LinkPreview>>;

    registerRepliesRef?: (
        commentId: string,
        ref: ThreadRepliesHandle | null
    ) => void;
}

const urlRegex = /(https?:\/\/[^\s]+)/g;

const getRelativeTime = (date: string | Date) => {
    const now = new Date();
    const created = new Date(date);
    const diffMs = now.getTime() - created.getTime();

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return `${seconds}s`;
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;

    return created.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
};

export const CommentCard = memo(
    ({
        comment,
        BACKEND_URL,
        linkPreviewCache,
        onDelete,
        postOwnerId,
        onReply,
        registerRepliesRef,
        showThreadReplies = true,
    }: CommentCardProps) => {
        const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null);
        const [loadingPreview, setLoadingPreview] = useState(false);
        const urls = comment.text?.match(urlRegex);
        const navigate = useNavigate();
        const url = urls?.[0];
        const fetchedRef = useRef(false);
        const { user } = useUser();
        const [showMenu, setShowMenu] = useState(false);
        const menuRef = useRef<HTMLDivElement>(null);
        const repliesRefCallback = useCallback(
            (ref: ThreadRepliesHandle | null) => {
                registerRepliesRef?.(comment._id, ref);
            },
            [registerRepliesRef, comment._id]
        );


        useEffect(() => {
            const handleClickOutside = (e: MouseEvent) => {
                if (
                    menuRef.current &&
                    !menuRef.current.contains(e.target as Node)
                ) {
                    setShowMenu(false);
                }
            };

            document.addEventListener("mousedown", handleClickOutside);

            return () =>
                document.removeEventListener("mousedown", handleClickOutside);
        }, []);


        const canDelete =
            user?._id === comment.user?._id ||
            user?._id === postOwnerId ||
            user?.role === "admin";

        const hasCommentText = (comment.text ?? "").trim().length > 0;

        const timestamp = useMemo(
            () => getRelativeTime(comment.createdAt),
            [comment.createdAt]
        );

        const formatPlayTime = (ms?: number) => {
            if (!ms) return "";
            const totalSeconds = Math.floor(ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            if (minutes > 0) {
                return `${minutes}m ${seconds}s`;
            }
            return `${seconds}s`;
        };

        return (
            <div className="flex gap-3 py-3 group">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <img
                        src={
                            comment.isDeleted
                                ? "/default_avatar.png"
                                : comment.user?.avatar || "/default_avatar.png"
                        }
                        onClick={(e) => {
                            if (comment.isDeleted) return;

                            e.stopPropagation();
                            navigate(`/profile/${comment.user?.username}`);
                        }}
                        className="h-8 w-8 sm:h-9 sm:w-9 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        alt="Avatar"
                    />
                </div>

                {/* Right side: Comment body on top, Replies directly below */}
                <div className="flex-1 min-w-0">
                    {/* Comment Card Bubble */}
                    <div className="bg-gray-50 dark:bg-zinc-900 rounded-2xl px-4 py-3 shadow-sm border border-gray-100 dark:border-zinc-800">
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex items-start gap-2 flex-wrap">
                                {/* User name + username */}
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm text-gray-900 dark:text-gray-100">
                                        {comment.isDeleted
                                            ? "Deleted"
                                            : comment.user?.displayName || "Anonymous"}
                                    </span>

                                    {!comment.isDeleted && comment.user?.username && (
                                        <span className="text-xs text-gray-400 dark:text-zinc-500">
                                            @{comment.user.username}
                                        </span>
                                    )}
                                </div>

                                {comment.parentComment &&
                                    comment.mentions &&
                                    comment.mentions.length > 0 && (
                                        <span className="text-xs text-gray-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                                            <span>replying to</span>
                                            <span className="text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer">
                                                @{comment.mentions[0]?.originalUsername ||
                                                    comment.mentions[0]?.user?.username}
                                            </span>
                                        </span>
                                    )}

                                {comment.review?.isGameReview && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold tracking-wide shrink-0 text-teal-600 dark:text-[#62d4ae] mt-0.5">
                                        Played {formatPlayTime(comment.review.feedback?.playTimeMs)}
                                    </span>
                                )}

                                {comment.review?.isGameReview &&
                                    comment.review.feedback?.overall && (
                                        <span className="inline-flex items-center rounded-md bg-amber-100 px-1 py-0.5 text-[10px] font-bold tracking-wide text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 mt-0.5">
                                            ⭐ {comment.review.feedback.overall}/10
                                        </span>
                                    )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-[11px] text-gray-400 font-medium">
                                    {timestamp}
                                </span>

                                {canDelete && !comment.isDeleted && (
                                    <div ref={menuRef} className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowMenu((v) => !v);
                                            }}
                                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                        >
                                            <MoreHorizontal size={16} />
                                        </button>

                                        {showMenu && !comment.isDeleted && (
                                            <div className="absolute right-0 mt-2 w-36 rounded-lg bg-white dark:bg-zinc-900 shadow-xl border border-gray-200 dark:border-zinc-700 z-50">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowMenu(false);
                                                        onDelete(comment);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                                                >
                                                    <Trash2 size={15} />
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>


                        {comment.isDeleted ? (
                            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                                <span className="italic text-gray-400 dark:text-zinc-500">
                                    [deleted]
                                </span>
                            </div>
                        ) : hasCommentText ? (
                            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                                {comment.text.split(urlRegex).map((part, i) =>
                                    urlRegex.test(part) ? (
                                        <a
                                            key={i}
                                            href={part}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                                        >
                                            <LinkIcon size={12} />
                                            {new URL(part).hostname}
                                        </a>
                                    ) : (
                                        <MentionText
                                            key={i}
                                            text={part}
                                            mentions={comment.mentions}
                                        />
                                    )
                                )}
                            </div>
                        ) : null}

                        <div className="mt-1.5">
                            {!comment.isDeleted && (
                                <button
                                    onClick={() => onReply(comment)}
                                    className="text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors"
                                >
                                    Reply
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Link Preview Section */}
                    {loadingPreview && (
                        <div className="mt-2 h-20 w-full bg-gray-100 dark:bg-zinc-800 animate-pulse rounded-xl" />
                    )}

                    {linkPreview && (
                        <a
                            href={linkPreview.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block mt-2 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-blue-400 dark:hover:border-blue-500 transition-all shadow-sm"
                        >
                            <div className="flex flex-col sm:flex-row">
                                {linkPreview.image && (
                                    <img
                                        src={linkPreview.image}
                                        className="sm:w-28 h-24 sm:h-auto object-cover border-b sm:border-b-0 sm:border-r border-gray-100 dark:border-zinc-800"
                                        alt=""
                                    />
                                )}
                                <div className="p-2.5 overflow-hidden">
                                    <h4 className="font-bold text-xs text-gray-900 dark:text-gray-100 truncate">
                                        {linkPreview.title}
                                    </h4>
                                    <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">
                                        {linkPreview.description}
                                    </p>
                                    <p className="text-[10px] text-blue-500 mt-1 font-mono uppercase tracking-wider">
                                        {new URL(linkPreview.url!).hostname}
                                    </p>
                                </div>
                            </div>
                        </a>
                    )}

                    {/* Replies Component renders right under the comment */}

                    {showThreadReplies && (
                        <ThreadReplies
                            ref={repliesRefCallback}
                            comment={comment}
                            BACKEND_URL={BACKEND_URL}
                            postOwnerId={postOwnerId}
                            onDelete={onDelete}
                            onReply={onReply}
                            registerRepliesRef={registerRepliesRef}
                        />
                    )}
                </div>
            </div>
        );
    }
);

CommentCard.displayName = "CommentCard";
export default CommentCard;