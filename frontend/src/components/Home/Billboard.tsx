import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from "react";
const Tower = React.lazy(() => import("./Tower"));

type Face = "follow" | "posts" | "reading";

const Billboard: React.FC = () => {
  const [activeSection, setActiveSection] = useState<Face>("follow");
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ✅ Memoize sections so they're not rebuilt every render
  const sections = useMemo(
    () => [
      {
        id: "follow",
        title: "follow",
        content: (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-white">
              Stay updated with my latest game dev insights and tutorials.
            </p>
            <div className="flex flex-col gap-2 ">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button className="bg-purple-600 ml-24 text-white px-3 py-2 rounded-lg hover:bg-purple-700 transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        ),
      },
      {
        id: "posts",
        title: "posts",
        content: (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">2.4K</div>
                <div className="text-sm text-gray-600 dark:text-white">Monthly Views</div>
              </div>
              <div className="p-3 rounded-lg">
                <div className="text-2xl font-bold text-green-600">87%</div>
                <div className="text-sm text-gray-600 dark:text-white">Engagement</div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: "reading",
        title: "reading",
        content: (
          <div className="space-y-3">
            {["Game Physics", "AI in Games", "Shader Programming"].map((topic, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 text-gray-600 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer"
              >
                <i className="fas fa-fire text-orange-500"></i>
                <span>{topic}</span>
              </div>
            ))}
          </div>
        ),
      },
    ],
    []
  );

  // ✅ Scroll Loop Effect
  useEffect(() => {
    const scroll = scrollRef.current;
    if (!scroll) return;

    const scrollWidth = scroll.scrollWidth / 3;
    const midpoint = scrollWidth * 1.5;
    scroll.scrollLeft = scrollWidth; // Start in middle

    const handleScroll = () => {
      if (scroll.scrollLeft >= midpoint) {
        scroll.scrollLeft -= scrollWidth;
      } else if (scroll.scrollLeft <= scrollWidth / 2) {
        scroll.scrollLeft += scrollWidth;
      }
    };

    scroll.addEventListener("scroll", handleScroll);
    return () => scroll.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ Memoized drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current!.offsetLeft);
    setScrollLeft(scrollRef.current!.scrollLeft);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - scrollRef.current!.offsetLeft;
      scrollRef.current!.scrollLeft = scrollLeft - (x - startX) * 2;
    },
    [isDragging, scrollLeft, startX]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent, id: Face) => {
      if (isDragging) {
        e.preventDefault();
        return;
      }
      setActiveSection(id);
    },
    [isDragging]
  );

  return (
    <div className="h-full bg-white dark:bg-gray-800 shadow-2xl rounded-lg p-6">
      <div
        className="relative overflow-hidden mb-6 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
      >
        <div
          ref={scrollRef}
          className="flex overflow-x-hidden"
          style={{ scrollBehavior: isDragging ? "auto" : "smooth" }}
        >
          {[...sections, ...sections, ...sections].map((section, index) => (
            <button
              key={`${section.id}-${index}`}
              onClick={(e) => handleClick(e, section.id as Face)}
              className={`flex-shrink-0 px-4 py-2 rounded-full whitespace-nowrap transition-colors mr-4 ${
                activeSection === section.id
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {section.title}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[80%] border-t border-purple-600 pt-2 dark:border-gray-200 transition-opacity duration-300">
        <Suspense fallback={<div className="text-center text-gray-400">Loading section...</div>}>
          <Tower activeFace={activeSection} />
        </Suspense>
      </div>
    </div>
  );
};

export default Billboard;
