import React, { useState, useEffect, useRef, useMemo } from "react";
import { PlusCircle } from "lucide-react";

type Face = "follow" | "posts" | "reading";

interface TowerProps {
  activeFace: Face;
}

const Tower: React.FC<TowerProps> = ({ activeFace }) => {
  const cubeRef = useRef<HTMLDivElement>(null);
  const [translateZ, setTranslateZ] = useState(150);

  useEffect(() => {
    if (cubeRef.current) {
      setTranslateZ(cubeRef.current.offsetWidth / 2);
    }
  }, []);

  const rotation = useMemo(() => {
    const map: Record<Face, string> = {
      follow: "rotateY(0deg)",
      posts: "rotateY(-90deg)",
      reading: "rotateY(-180deg)",
    };
    return map[activeFace];
  }, [activeFace]);

  const renderFollowFace = () => (
    <div className="face face-front dark:text-white overflow-y-auto" style={{ transform: `translateZ(${translateZ}px)` }}>
      <div className="h-full space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt={`User ${i + 1}`}
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-semibold">User Name {i + 1}</h3>
              <p className="text-sm text-gray-500">@username{i + 1}</p>
            </div>
            <PlusCircle className="w-6 h-6" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderPostsFace = () => (
    <div className="face face-right dark:text-white overflow-y-auto" style={{ transform: `rotateY(90deg) translateZ(${translateZ}px)` }}>
      <div className="h-full space-y-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="border-b pb-4">
            <div className="flex items-center gap-2 mb-2">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt={`Author ${i + 1}`}
                className="w-8 h-8 rounded-full"
              />
              <span className="font-semibold mb-2">Author {i + 1}</span>
            </div>
            <p className="text-sm text-gray-600 mb-2 dark:text-gray-200">
              Sample post content that demonstrates layout and readability.
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReadingFace = () => (
    <div className="face face-back dark:text-white overflow-y-auto" style={{ transform: `rotateY(180deg) translateZ(${translateZ}px)` }}>
      <div className="h-full space-y-4">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="border-b pb-4">
            <h3 className="font-semibold mb-2">Article Title {i + 1}</h3>
            <p className="text-sm text-gray-600 mb-2 dark:text-gray-200">
              Brief description of article content to give a preview.
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex-1 dark:bg-gray-700 h-full w-full overflow-hidden flex items-center justify-center perspective-1000">
      <div
        ref={cubeRef}
        className="relative w-full h-full flex justify-center preserve-3d transition-transform duration-700"
        style={{ transform: rotation }}
      >
        {renderFollowFace()}
        {renderPostsFace()}
        {renderReadingFace()}
      </div>
    </div>
  );
};

export default Tower;
