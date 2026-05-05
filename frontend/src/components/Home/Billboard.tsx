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

// Fisher-Yates shuffle — returns a new array
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
  // Interleave: shuffle everything together so pockets appear between static faces
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

  useEffect(() => {
    setLoadingPockets(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/fetchpockets/fetch_pockets`)
      .then((res) => res.json())
      .then((data) => {
        const fetched: Pocket[] = data.pockets || [];
        setPockets(fetched);
        setFaces(buildFaces(fetched)); // shuffle once on load
      })
      .catch(() => { })
      .finally(() => setLoadingPockets(false));
  }, []);

  const totalFaces = faces.length;
  const activeFace = faces[activeIndex];

  const next = useCallback(() => setActiveIndex((p) => (p + 1) % totalFaces), [totalFaces]);
  const prev = useCallback(() => setActiveIndex((p) => (p - 1 + totalFaces) % totalFaces), [totalFaces]);

  useEffect(() => {
    intervalRef.current = setInterval(next, 20000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [next]);
  const handleNext = () => {
    stopAuto();   // ⛔ stop auto rotation
    next();       // 👉 move to next face
  };

  const handlePrev = () => {
    stopAuto();   // ⛔ stop auto rotation
    prev();       // 👉 move to previous face
  };

  const stopAuto = () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  const resumeAuto = () => { intervalRef.current = setInterval(next, 15000); };

  return (
    <div
      className="flex flex-col h-full w-full dark:bg-[#191919] rounded-xl overflow-hidden"
      onMouseEnter={stopAuto}
      onMouseLeave={resumeAuto}
      onWheel={stopAuto}
    >
      <div className="flex items-center justify-between px-2 py-3">
        <h2 className="text-lg font-bold dark:text-white capitalize">
          {activeFace ? faceLabel(activeFace) : ""}
        </h2>
        <div className="flex gap-2">
          <button onClick={handlePrev} className="p-2 rounded-full bg-gray-100 dark:bg-[#252525] dark:text-white hover:bg-purple-600 hover:text-white">
            <ArrowLeft size={20} />
          </button>
          <button onClick={handleNext} className="p-2 rounded-full bg-gray-100 dark:bg-[#252525] dark:text-white hover:bg-purple-600 hover:text-white">
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden border-t border-purple-600 dark:border-gray-200">
        <Suspense fallback={<div className="text-center text-gray-400 pt-10">Loading...</div>}>
          {loadingPockets ? (
            <div className="text-center text-gray-400 pt-10">Loading...</div>
          ) : (
            <Tower activeFaceIndex={activeIndex} faces={faces} />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default React.memo(Billboard);