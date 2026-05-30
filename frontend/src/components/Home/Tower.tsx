import React, { useEffect, useRef, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import FollowFace from "./FollowFace";
import PocketPost from "../Post/PocketPost";
import { usePublishedArticles } from "../../context/PublishedArticleContext";

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

const Tower: React.FC<{
  activeFaceIndex: number;
  faces: FaceDescriptor[];
  onPrev?: () => void;
  onNext?: () => void;
}> = ({ activeFaceIndex, faces, onPrev, onNext }) => {
  const { articles } = usePublishedArticles();
  const cubeRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [translateZ, setTranslateZ] = useState(150);

  const totalFaces = faces.length;
  const angleStep = 360 / totalFaces;

  useEffect(() => {
    const update = () => {
      if (cubeRef.current) {
        const w = cubeRef.current.offsetWidth;
        const r = (w / 2) / Math.tan(Math.PI / totalFaces);
        setTranslateZ(r);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [totalFaces]);

  const rotation = useMemo(
    () => `rotateY(${-angleStep * activeFaceIndex}deg)`,
    [activeFaceIndex, angleStep]
  );

  return (
    <div className="h-full w-full bg-[#F3F4F6] dark:bg-[#191919] overflow-hidden flex perspective-2000">
      <div
        ref={cubeRef}
        className="relative w-full h-full preserve-3d transition-transform duration-700 ease-in-out"
        style={{ transform: rotation }}
      >
        {faces.map((face, i) => {
          const faceTransform = `rotateY(${angleStep * i}deg) translateZ(${translateZ}px)`;

          if (face.type === "follow") {
            return (
              <FollowFace
                key="follow"
                translateZ={translateZ}
                faceAngle={angleStep * i}  // ← passes the shuffled angle
              />
            );
          }

          if (face.type === "reading") {
            return (
              <div
                key="reading"
                className="absolute inset-0 bg-[#F3F4F6] dark:bg-[#191919] dark:text-white overflow-y-auto backface-hidden"
                style={{ transform: faceTransform }}
              >
                <div className="grid grid-cols-2 gap-4 px-3 py-6">
                  {articles.map((canvas) => (
                    <div
                      key={canvas._id}
                      onClick={() => navigate(`/articles/${canvas._id}`)}
                      className="cursor-pointer group flex flex-col"
                    >
                      <div className="relative aspect-[3/4] bg-gray-200 dark:bg-[#111] rounded-xl overflow-hidden border border-[#E0E0E5] dark:border-white/5 shadow-lg transition-transform duration-300 group-hover:border-purple-500/50 group-hover:shadow-purple-500/10">
                        {canvas.hero_image_url ? (
                          <img
                            src={canvas.hero_image_url}
                            alt={canvas.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-400 dark:text-[#444] space-y-2">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                              <PlusCircle size={14} />
                            </div>
                            <span>No Image</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      </div>
                      <div className="mt-3 px-1">
                        <h3 className="text-xs font-semibold line-clamp-2 leading-tight text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {canvas.title}
                        </h3>
                        {canvas.author_name && (
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-gray-500 dark:text-[#777] font-medium">
                            {canvas.author_name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }

          // Pocket face
          return (
            <div
              key={face.pocket._id}
              className="absolute inset-0 bg-[#F3F4F6] dark:bg-[#191919] overflow-y-auto backface-hidden"
              style={{ transform: faceTransform }}
            >
              <PocketPost
                {...face.pocket}
                onPrev={onPrev}
                onNext={onNext}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(Tower);