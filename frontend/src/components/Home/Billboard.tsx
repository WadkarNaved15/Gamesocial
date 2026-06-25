import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
const Tower = React.lazy(() => import("./Tower"));

interface Pocket {
  _id: string;
  user: { username: string; avatar?: string };
  createdAt: string;
  brandName: string;
  tagline?: string;
  compiledBundleUrl: string;
}

type StaticFace = { type: "follow" } | { type: "reading" };
type PocketFace = { type: "pocket"; pocket: Pocket };
type FaceDescriptor = StaticFace | PocketFace;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildFaces(pockets: Pocket[]): FaceDescriptor[] {
  const statics: FaceDescriptor[] = [{ type: "follow" }, { type: "reading" }];
  const pocketFaces: FaceDescriptor[] = pockets.map((p) => ({ type: "pocket", pocket: p }));
  return shuffle([...statics, ...pocketFaces]);
}

function faceLabel(face: FaceDescriptor): string {
  if (face.type === "follow") return "Follow";
  if (face.type === "reading") return "Reading";
  return face.pocket.brandName;
}

const Billboard: React.FC = () => {
  const [pockets, setPockets] = useState<Pocket[]>([]);
  const [faces, setFaces] = useState<FaceDescriptor[]>([{ type: "follow" }, { type: "reading" }]);
  const [loadingPockets, setLoadingPockets] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const userStoppedRef = useRef(false); // true = user clicked arrow, never auto-rotate again
  const isHoveringRef = useRef(false);  // true = mouse is over the billboard

  useEffect(() => {
    setLoadingPockets(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/fetchpockets/fetch_pockets`)
      .then((res) => res.json())
      .then((data) => {
        const fetched: Pocket[] = data.pockets || [];
        setPockets(fetched);
        setFaces(buildFaces(fetched));
      })
      .catch(() => { })
      .finally(() => setLoadingPockets(false));
  }, []);

  const totalFaces = faces.length;
  const activeFace = faces[activeIndex];
  const headerData =
    activeFace?.type === "pocket"
      ? {
        title: activeFace.pocket.brandName,
        subtitle: activeFace.pocket.tagline,
        avatar: activeFace.pocket.user.avatar,
      }
      : activeFace?.type === "follow"
        ? {
          title: "Follow",
        }
        : {
          title: "Reading",
        };
  const isPocketFace = activeFace?.type === "pocket";

  const next = useCallback(() => {
    setActiveIndex((p) => (p + 1) % totalFaces);
  }, [totalFaces]);

  const prev = useCallback(() => {
    setActiveIndex((p) => (p - 1 + totalFaces) % totalFaces);
  }, [totalFaces]);

  // ---------- interval helpers ----------
  const clearAutoInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startAutoInterval = useCallback(() => {
    clearAutoInterval();
    intervalRef.current = setInterval(() => {
      setActiveIndex((p) => (p + 1) % totalFaces);
    }, 20000);
  }, [totalFaces]);

  // Start auto-rotation on mount and whenever totalFaces changes
  useEffect(() => {
    if (userStoppedRef.current) return; // user already clicked an arrow, don't restart
    startAutoInterval();
    return () => clearAutoInterval();
  }, [startAutoInterval]);

  // ---------- mouse handlers ----------
  const handleMouseEnter = () => {
    isHoveringRef.current = true;
    clearAutoInterval(); // pause while hovering
  };

  const handleMouseLeave = () => {
    isHoveringRef.current = false;
    if (!userStoppedRef.current) {
      startAutoInterval(); // resume only if user hasn't clicked an arrow
    }
  };

  // ---------- arrow handlers ----------
  const handleNext = () => {
    userStoppedRef.current = true; // permanently stop auto-rotation
    clearAutoInterval();
    next();
  };

  const handlePrev = () => {
    userStoppedRef.current = true; // permanently stop auto-rotation
    clearAutoInterval();
    prev();
  };

  return (
    <div
      className="flex flex-col h-full w-full relative bg-transparent rounded-2xl overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >

      <div className="flex-1 overflow-hidden relative">
        {/* LEFT BUTTON */}
        <button
          onClick={handlePrev}
          className="
      absolute
      top-1/2
      -translate-y-1/2
      z-50
      w-10
      h-10
      rounded-full
      bg-black/50
      backdrop-blur-md
      text-white
      flex
      items-center
      justify-center
      hover:bg-black/70
      transition
    "
        >
          <ArrowLeft size={18} />
        </button>

        {/* RIGHT BUTTON */}
        <button
          onClick={handleNext}
          className="
      absolute
      top-1/2
      -translate-y-1/2
      z-50
      w-10
      h-10
      rounded-full
      bg-black/50
      backdrop-blur-md
      text-white
      flex
      items-center
      justify-center
      hover:bg-black/70
      transition
    "
        >
          <ArrowRight size={18} />
        </button>
        <Suspense fallback={<div className="text-center text-white/60 pt-10">Loading...</div>}>
          {loadingPockets ? (
            <div className="text-center text-white/60 pt-10">Loading...</div>
          ) : (
            <Tower
              activeFaceIndex={activeIndex}
              faces={faces}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default React.memo(Billboard);