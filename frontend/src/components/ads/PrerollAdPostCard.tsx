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
}

const PrerollAdPostCard: React.FC<Props> = ({
    brandName,
    brandLogo,
    ctaText = "PLAY NOW",
    ctaLink,
    asset,
    duration = 15,
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
        <div className="w-full max-w-2xl aspect-video bg-black relative overflow-hidden group select-none border border-zinc-800 rounded-xl shadow-2xl">

            {/* CORE VIDEO VIEWPORT */}
            <div className="w-full h-full flex items-center justify-center relative">
                {asset ? (
                    <video
                        ref={videoRef}
                        src={asset.url}
                        autoPlay
                        loop
                        playsInline
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="text-center text-zinc-600 flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full border border-dashed border-zinc-700 flex items-center justify-center animate-spin [animation-duration:16s]" />
                        <p className="text-[10px] uppercase font-bold tracking-widest text-zinc-500">Awaiting Video Node Payload</p>
                    </div>
                )}
            </div>
            {/* BRAND & TRANSPARENT GLASS CTA CONTAINER LAYOUT */}
            <div
                className="
    absolute
    bottom-4
    inset-x-4
    z-20
    flex
    justify-between
    items-end
    gap-4
    pointer-events-none
  "
            >

                {/* BRAND PANEL HOVER */}
                <div
                    className="
    flex items-center gap-2.5
    px-3 py-2
    rounded-full
    bg-black/20
    border border-white/20
    shadow-[0_4px_20px_rgba(0,0,0,0.4)]
  "
                >
                    <img
                        src={brandLogo || "/default_avatar.png"}
                        className="
    w-8 h-8
    rounded-full
    object-cover
    border
    border-white/30
    shadow-[0_0_12px_rgba(0,0,0,0.5)]
  "
                        alt="Brand Identity"
                    />
                    <span
                        className="
    text-white
    text-xs
    font-bold
    tracking-wide
    drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
  "
                    >
                        {brandName || "Brand Identity"}
                    </span>
                </div>

                {/* NON-OBSTRUCTIVE GLASS ACTION BUTTON */}
                <a
                    href={ctaLink || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="
    pointer-events-auto
    flex items-center gap-2
    px-5 py-2.5
    rounded-xl

    bg-black/45

    border border-white/20

    text-white
    text-[11px]
    font-black
    uppercase
    tracking-wider

    shadow-[0_4px_20px_rgba(0,0,0,0.5)]

    hover:bg-black/60
    hover:scale-[1.02]

    active:scale-95

    transition-all
  "
                >
                    <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                        {ctaText}
                    </span>

                    <ExternalLink size={12} />
                </a>
            </div>

            {/* LINEAR PIPELINE AD TRACKER TIMELINE */}
            <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 dark:bg-zinc-900/50 z-20">
                <div
                    className="h-full bg-white/70 backdrop-blur-sm transition-all ease-linear duration-1000"
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
};

export default PrerollAdPostCard;