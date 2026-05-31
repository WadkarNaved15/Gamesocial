import React from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface BillboardHeaderProps {
    title: string;
    subtitle?: string;
    avatar?: string;
    onPrev: () => void;
    onNext: () => void;
}

const BillboardHeader: React.FC<BillboardHeaderProps> = ({
    title,
    subtitle,
    avatar,
    onPrev,
    onNext,
}) => {
    return (
        <div
            style={{
                display: "flex",
                gap: "100px",
                background: "#191919",
                height: "60px",       // fixed header height
                minHeight: "60px",
                maxHeight: "60px",
                boxSizing: "border-box",

            }}
        >
            {/* LEFT CONTENT BOX */}
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    borderTopRightRadius: "8px",
                    gap: "10px",
                    padding: "10px 12px",
                    background: "rgba(32,30,31,0.96)",
                    minWidth: 0
                }}
            >
                {avatar && (
                    <img
                        src={avatar}
                        alt={title}
                        style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "999px",
                            objectFit: "cover",
                            flexShrink: 0,
                            border: "2px solid rgba(255,255,255,0.15)",
                        }}
                    />
                )}

                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        minWidth: 0,
                        flex: 1,
                    }}
                >
                    <span
                        style={{
                            color: "white",
                            fontWeight: 800,
                            fontSize: "14px",
                            lineHeight: 1.1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                    >
                        {title}
                    </span>

                    {subtitle && (
                        <span
                            style={{
                                color: "rgba(255,255,255,0.72)",
                                fontSize: "11px",
                                marginTop: "3px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>

            {/* RIGHT ARROW BOX */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "0 10px",
                    background: "#191919",
                    flexShrink: 0,
                }}
            >
                <button
                    onClick={onPrev}
                    style={{
                        border: "none",
                        background: "rgba(255,255,255,0.08)",
                        color: "white",
                        borderRadius: "999px",
                        width: "28px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    <ArrowLeft size={14} />
                </button>

                <button
                    onClick={onNext}
                    style={{
                        border: "none",
                        background: "rgba(255,255,255,0.08)",
                        color: "white",
                        borderRadius: "999px",
                        width: "28px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                    }}
                >
                    <ArrowRight size={14} />
                </button>
            </div>
        </div>
    );
};

export default BillboardHeader;