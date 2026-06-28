import React, { useState, useEffect, useRef } from "react";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react"; // 🔥 Added icons
import { useAudio } from "../../context/AudioContext";
type VideoAsset = {
    type: "video";
    url: string;
    name?: string;
    processingStatus?: "pending" | "processing" | "completed" | "failed"; // 🔥 Added status
    thumbnailUrl?: string; // 🔥 Added thumbnail
};

interface Props {
    brandName: string;
    brandLogo?: string | null;
    ctaText?: string;
    ctaLink?: string;
    asset?: VideoAsset | null;
    duration: number;
    fullscreen?: boolean;
    onEnded?: () => void;
}



const PrerollAdPostCard: React.FC<Props> = ({
    brandName,
    brandLogo,
    ctaText = "PLAY NOW",
    ctaLink,
    asset,
    duration = 15,
    fullscreen,
    onEnded,
}) => {
    const currentTimeRef = useRef(0);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const timeTextRef = useRef<HTMLSpanElement>(null);
    const animationRef = useRef<number | null>(null);
    const { setAudioFocusId } = useAudio();
    const AD_AUDIO_ID = "PREROLL_AD";

    const startProgressLoop = () => {
        const video = videoRef.current;
        if (!video) return;

        if (animationRef.current) return; // 🔥 prevent duplicate loops

        const update = () => {
            const v = videoRef.current;
            if (!v) return;

            if (!v.paused && !v.ended) {
                const time = v.currentTime;

                if (timeTextRef.current) {
                    timeTextRef.current.textContent = `${Math.floor(time)}s`;
                }

                if (progressBarRef.current) {
                    const percent = Math.min((time / duration) * 100, 100);
                    progressBarRef.current.style.width = `${percent}%`;
                }

                animationRef.current = requestAnimationFrame(update);
            } else {
                animationRef.current = requestAnimationFrame(update);
            }
        };

        animationRef.current = requestAnimationFrame(update);
    };
    useEffect(() => {
        return () => {
            setAudioFocusId(null)
            stopProgressLoop();
        };
    }, []);

    const stopProgressLoop = () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
    };


    return (
        <div
            className={
                fullscreen
                    ? `
                w-screen
                h-screen
                bg-black
                flex
                items-center
                justify-center
                overflow-hidden
                group
                select-none
            `
                    : `
                w-full
                max-w-2xl
                aspect-video
                bg-black
                relative
                overflow-hidden
                group
                select-none
                border
                border-zinc-800
                shadow-2xl
                rounded-xl
            `
            }
        >
            {/* CORE VIDEO VIEWPORT */}
            <div className="w-full h-full flex items-center justify-center relative z-10">
                {asset ? (
    <>
        <video
            ref={videoRef}
            src={asset.url}
            autoPlay
            playsInline
            preload="metadata"
            muted={false}

            // onLoadStart={() => {
            //     console.log("VIDEO loadstart", asset.url);
            // }}

            // onLoadedMetadata={(e) => {
            //     console.log(
            //         "VIDEO metadata",
            //         e.currentTarget.videoWidth,
            //         e.currentTarget.videoHeight,
            //         e.currentTarget.duration
            //     );
            // }}

            // onLoadedData={() => {
            //     console.log("VIDEO loadeddata");
            // }}

            // onCanPlay={() => {
            //     console.log("VIDEO canplay");
            // }}

            onPlay={() => {
                // console.log("VIDEO play");
                setAudioFocusId(AD_AUDIO_ID);
                startProgressLoop();
            }}

            // onPause={() => {
            //     console.log("VIDEO pause");
            // }}

            onEnded={() => {
                // console.log("VIDEO ended");

                setAudioFocusId(null);
                stopProgressLoop();

                onEnded?.();
            }}

            // onError={(e) => {
            //     const video = e.currentTarget;

            //     console.log("VIDEO ERROR", {
            //         src: video.currentSrc,
            //         networkState: video.networkState,
            //         readyState: video.readyState,
            //         error: video.error,
            //     });
            // }}

            className={`w-full h-full max-w-full max-h-full ${
                fullscreen
                    ? "object-cover"
                    : "object-contain"
            }`}
        />
    </>
) : (
                    <div className="text-center text-zinc-600 flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full border border-dashed border-zinc-700 flex items-center justify-center animate-spin [animation-duration:16s]" />
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Awaiting Video Node Payload</p>
                    </div>
                )}
            </div>

            {/* BRAND + CTA PILL */}
            <div className={
                fullscreen
                    ? "absolute bottom-12 left-8 z-30 flex flex-col gap-1.5"
                    : "absolute bottom-4 left-4 z-20 flex flex-col gap-1.5"
            }>
                <a
                    href={ctaLink || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="
                        pointer-events-auto
                        inline-flex
                        items-center
                        gap-3
                        px-3
                        py-2
                        rounded-full
                        bg-black/40
                        backdrop-blur-md
                        border
                        border-white/20
                        shadow-[0_4px_16px_rgba(0,0,0,0.4)]
                        hover:bg-black/60
                        hover:border-white/40
                        transition-all
                        duration-200
                    "
                >
                    <img
                        src={brandLogo || "/default_avatar.png"}
                        alt="Brand Identity"
                        className="
                            w-7
                            h-7
                            rounded-full
                            object-cover
                            border
                            border-white/20
                            shadow-[0_1px_8px_rgba(0,0,0,0.35)]
                            shrink-0
                        "
                    />
                    <div className="flex items-center gap-3">
                        <span className="text-white text-xs font-bold whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            {brandName}
                        </span>

                        <div className="h-4 w-px bg-white/30" />

                        <span className="text-white text-[10px] font-black mt-0.5 uppercase tracking-wider whitespace-nowrap drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                            {ctaText}
                        </span>

                        <ExternalLink size={11} className="text-white opacity-90" />
                    </div>
                </a>
                {!fullscreen && (
                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
                        <span>Sponsored</span>
                        <span className="opacity-50">•</span>
                        <span ref={timeTextRef}>0s</span>
                    </div>
                )}
            </div>

            {/* Fullscreen Sponsored */}
            {fullscreen && (
                <div className="absolute bottom-3 left-0 z-40">
                    <div className="
                    flex
                    items-center
                    gap-1.5
                    px-2
                    py-1
                    drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]
                    text-[10px]
                    font-medium
                    text-white
                    select-none
                ">
                        <span>Sponsored</span>
                        <span className="opacity-50">•</span>
                        <span ref={timeTextRef}>0s</span>
                    </div>
                </div>
            )}

            {/* LINEAR PIPELINE AD TRACKER TIMELINE */}
            <div className={
                fullscreen
                    ? "absolute bottom-0 inset-x-0 h-1.5 bg-white/10 z-50"
                    : "absolute bottom-0 inset-x-0 h-1 bg-white/10 dark:bg-zinc-900/50 z-20"
            }>
                <div
                    ref={progressBarRef}
                    className="h-full bg-red-600"
                />
            </div>
        </div>
    );
};

export default PrerollAdPostCard;