// src/components/Post/PocketPost.tsx

import React, { memo, useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
const POCKET_HEIGHT = 550;

interface User { username: string; avatar?: string; }
interface PocketPostProps {
  _id: string; user: User; createdAt: string;
  likesCount?: number; isLiked?: boolean; commentsCount?: number;
  brandName: string; tagline?: string; compiledBundleUrl: string;
  onOpenDetails?: () => void; disableInteractions?: boolean;
  onPrev?: () => void;
  onNext?: () => void;
}

async function fetchBundleText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function buildSrcdoc(bundleCode: string): string {
  const safeCode = bundleCode.replace(/<\/script>/gi, "<\\/script>");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' https://esm.sh; style-src 'unsafe-inline'; img-src https: data: blob:; media-src https: blob:; connect-src 'none';"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:${POCKET_HEIGHT}px;overflow:hidden;background:transparent}
#root{width:100%;height:${POCKET_HEIGHT}px;overflow:hidden}
</style>
</head>
<body>
<div id="root"></div>
<script type="module">
import React    from "https://esm.sh/react@18";
import ReactDOM from "https://esm.sh/react-dom@18/client";
window.React    = React;
window.ReactDOM = ReactDOM;
</script>
<script>
window.addEventListener('error', function(e) {
  var r = document.getElementById('root');
  if (r) r.innerHTML =
    '<div style="padding:14px;font-family:monospace;font-size:11px;color:#f87171;background:#0a0a0a;height:100%;box-sizing:border-box;overflow:auto">' +
    '<b>Runtime error:</b><br/><br/>' + String(e.message||'').replace(/</g,'&lt;') +
    (e.lineno ? '<br/><span style="opacity:.4">line '+e.lineno+'</span>' : '') + '</div>';
});
${safeCode}
</script>
</body>
</html>`;
}

const PocketPost: React.FC<PocketPostProps> = ({
  _id, user, brandName, tagline, compiledBundleUrl, onOpenDetails,onPrev, onNext
}) => {
  const postRef = useRef<HTMLElement>(null);
  const viewStart = useRef<number | null>(null);
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";
  const navigate = useNavigate();
  const [srcdoc, setSrcdoc] = useState<string | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrcdoc(null);
    setFetchErr(null);
    fetchBundleText(compiledBundleUrl)
      .then(code => { if (!cancelled) setSrcdoc(buildSrcdoc(code)); })
      .catch(err => { if (!cancelled) setFetchErr(String(err.message)); });
    return () => { cancelled = true; };
  }, [compiledBundleUrl]);


  // Stable track function — wrapped in useCallback so the analytics
  // useEffect doesn't need to re-run when the component re-renders.
  const track = useCallback((event: string, seconds?: number) => {
    fetch(`${BACKEND_URL}/api/pockets/entries/${_id}/analytics`, {
      method: "POST", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, seconds }),
    }).catch(() => { });
  }, [BACKEND_URL, _id]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        viewStart.current = Date.now();
        track("impression");
      } else if (viewStart.current) {
        track("engagement", Math.floor((Date.now() - viewStart.current) / 1000));
        viewStart.current = null;
      }
    }, { threshold: 0.5 });
    if (postRef.current) observer.observe(postRef.current);
    return () => observer.disconnect();
  }, [track]); // track is stable — this effect runs once

  return (
    <article
      ref={postRef}
      className="relative w-full border-b border-gray-200 dark:border-zinc-800 bg-transparent"
    >
      <div
        style={{
          width: "100%",
          height: POCKET_HEIGHT,
          position: "relative",
          background:"transparent",
          // backgroundImage: "url('/defaultBackground.jpeg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={() => onOpenDetails?.()}
      >
        {/* 🔥 INNER POCKET (slightly smaller → border visible) */}
        <div
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
            background: "transparent",

            display: "flex",
            flexDirection: "column",

            // borderTopLeftRadius: "28px",
            // borderTopRightRadius: "28px",
            borderBottomLeftRadius: "12px",
            borderBottomRightRadius: "12px",
          }}
        >
          {/* Pocket Header */}
          {/* <div
            onClick={() => onOpenDetails?.()}
            style={{
              flexShrink: 0,

              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",

              background: "rgba(32, 30, 31, 0.96)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <img
              src={user.avatar || "/default_avatar.png"}
              alt={user.username}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${user.username}`);
              }}
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "999px",
                objectFit: "cover",
                flexShrink: 0,
                border: "2px solid rgba(255,255,255,0.15)",
              }}
            />

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
                {brandName}
              </span>

              {tagline && (
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
                  {tagline}
                </span>
              )}
            </div> */}

            {/* Arrows */}
            {/* <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexShrink: 0,
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPrev?.();
                }}
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
                onClick={(e) => {
                  e.stopPropagation();
                  onNext?.();
                }}
                style={{
                  border: "none",
                  background: "rgba(255,255,255,0.08)",
                  color: "white",
                  borderRadius: "999px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div> */}

          {!srcdoc && !fetchErr && (
            <div
              style={{
                flex: 1,
                width: "100%",
                background: "linear-gradient(90deg,#1a1a1a 25%,#222 50%,#1a1a1a 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }}
            />
          )}

          {fetchErr && (
            <div style={{
              flex: 1, width: "100%", background: "#0a0a0a",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              Error
            </div>
          )}

          {srcdoc && (
            <iframe
              key={compiledBundleUrl}
              title={`pocket-${_id}`}
              srcDoc={srcdoc}
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              style={{
                flex: 1,
                width: "100%",
                border: "none",
                display: "block",
              }}
            />

          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </article>
  );
};

export default memo(PocketPost);