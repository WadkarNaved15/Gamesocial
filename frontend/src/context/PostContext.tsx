import {
    createContext,
    useContext,
    useState,
    useCallback,
} from "react";

import type { PostProps } from "../types/Post";

type PostMap = Record<string, PostProps>;

type PostContextType = {
    postsById: PostMap;

    addPosts: (posts: PostProps[]) => void;

    updatePost: (
        postId: string,
        updates: Partial<PostProps>
    ) => void;

    removePost: (postId: string) => void;

    getPost: (postId: string) => PostProps | undefined;

    resetPosts: () => void;
};

const PostContext = createContext<PostContextType | null>(
    null
);

export const PostProvider = ({
    children,
}: {
    children: React.ReactNode;
}) => {
    const [postsById, setPostsById] =
        useState<PostMap>({});

    const addPosts = useCallback(
        (posts: PostProps[]) => {
            setPostsById((prev) => {
                const next = { ...prev };

                posts.forEach((post) => {
                    next[post._id] = {
                        ...next[post._id],
                        ...post,
                    };
                });

                return next;
            });
        },
        []
    );

    const updatePost = useCallback(
        (
            postId: string,
            updates: Partial<PostProps>
        ) => {
            console.log("UPDATE POST", postId, updates);
            setPostsById((prev) => {
                const existing = prev[postId];

                if (!existing) return prev;

                return {
                    ...prev,
                    [postId]: {
                        ...existing,
                        ...updates,
                    } as PostProps, // <--- Type cast here fixes line 64
                };
            });
        },
        []
    );

    const removePost = useCallback(
        (postId: string) => {
            setPostsById((prev) => {
                const next = { ...prev };

                delete next[postId];

                return next;
            });
        },
        []
    );

    const getPost = useCallback(
        (postId: string) => {
            return postsById[postId];
        },
        [postsById]
    );

    const resetPosts = useCallback(() => {
        setPostsById({});
    }, []);
    return (
        <PostContext.Provider
            value={{
                postsById,
                addPosts,
                updatePost,
                removePost,
                getPost,
                resetPosts,
            }}
        >
            {children}
        </PostContext.Provider>
    );
};

export const usePosts = () => {
    const context = useContext(PostContext);

    if (!context) {
        throw new Error(
            "usePosts must be used inside PostProvider"
        );
    }

    return context;
};