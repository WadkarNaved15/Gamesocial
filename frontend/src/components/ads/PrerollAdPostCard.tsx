import React, { useState, useEffect, useRef } from "react";
import { ExternalLink } from "lucide-react";

type VideoAsset = {
    type: "video";
    url: string;
    name?: string;
};

interface Props {
    brandName: string;
    brandLogo?: string | null;
    ctaText?: string;
    ctaLink?: string;
    asset?: VideoAsset | null;
    duration: number;
    fullscreen?: boolean;
}

const PrerollAdPostCard: React.FC<Props> = ({
    brandName,
    brandLogo,
    ctaText = "PLAY NOW",
    ctaLink,
    asset,
    duration = 15,
    fullscreen,
}) => {
    const [currentTime, setCurrentTime] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        setCurrentTime(0);
        if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => { });
        }

        const interval = setInterval(() => {
            setCurrentTime((prev) => {
                if (prev >= duration - 1) {
                    clearInterval(interval);
                    return duration;
                }
                return prev + 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [asset, duration]);

    const progressPercent = (currentTime / duration) * 100;

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
                    <video
                        ref={videoRef}
                        src={asset.url}
                        autoPlay
                        loop
                        playsInline
                        // CHANGED: Dynamic object-fit property based on fullscreen mode
                        className={`w-full h-full max-w-full max-h-full ${
                            fullscreen ? "object-cover" : "object-contain"
                        }`}
                    />
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
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] select-none">
                    <span>Sponsored</span>
                    <span className="opacity-50">•</span>
                    <span>{currentTime}s</span>
                </div>
            </div>

            {/* LINEAR PIPELINE AD TRACKER TIMELINE */}
            <div className={
                fullscreen
                    ? "absolute bottom-0 inset-x-0 h-1.5 bg-white/10 z-50"
                    : "absolute bottom-0 inset-x-0 h-1 bg-white/10 dark:bg-zinc-900/50 z-20"
            }>
                <div
                    className="h-full bg-red-600 backdrop-blur-sm transition-all ease-linear duration-1000"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
};

export default PrerollAdPostCard;