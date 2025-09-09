import React, { useState, useRef } from "react";
import { Heart, Twitter, Facebook, Clock } from "lucide-react";

function App() {
  const [pageData, setPageData] = useState({
    gameTitle: "MUSKETEER",
    postTitle: "Musketeer download bundle update!",
    postTag: "Devlog",
    postDate: "1 day ago",
    author: "Psytronik Software",
    italicQuote: "Bonjour mes amis!",
    bodyParagraph1:
      "Some free bonus extra content has now been added to the Musketeer download bundle...",
    bodyParagraph2:
      "The complete soundtrack from the game is also available to enjoy...",
    bodyParagraph3:
      "Also, some good news for people interested in obtaining a physical edition...",
    storeLink: "https://psytronik.bigcartel.com/products",
    closingQuote: "Have fun & keep it RETRO",
    signature: "Kenz / www.psytronik.net",
    files: [
      { id: 1, title: "Musketeer [C64] .tap, .d64 + .prg", size: "15 MB" },
      { id: 2, title: "Musketeer C64 Soundtrack (mp3)", size: "41 MB" },
    ],
    price: "$3.99 USD",
    gameInfoTitle: "Musketeer (C64)",
    gameInfoDescription: "An excellent swashbuckling action-adventure for the C64!",
    gameDetails: {
      status: "Released",
      author: "Psytronik Software",
      genre: "Action, Adventure",
      tags: "Arcade, Commodore 64, Retro",
    },
    screenshot1:
      "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=600",
    screenshot2:
      "https://images.pexels.com/photos/1293261/pexels-photo-1293261.jpeg?auto=compress&cs=tinysrgb&w=600",
    bgImage: "",
  });

  const screenshot1Ref = useRef(null);
  const screenshot2Ref = useRef(null);
  const bgImageRef = useRef(null);
  const titleImageRef = useRef(null);

  const handleChange = (key, e) => {
    setPageData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleNestedChange = (parent, key, e) => {
    setPageData((prev) => ({
      ...prev,
      [parent]: { ...prev[parent], [key]: e.target.value },
    }));
  };

  const handleFileChange = (key, e) => {
    const file = e.target.files[0];
    if (file) {
      const newImageUrl = URL.createObjectURL(file);
      setPageData((prev) => ({ ...prev, [key]: newImageUrl }));
    }
  };

  return (
    <div className="relative min-h-screen ">
      {/* Background Image Container */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-slate-800 bg-center"
        style={{
          backgroundImage: pageData.bgImage
            ? `linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%), url(${pageData.bgImage})`
            : "linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)",
        }}
      ></div>

      {/* Main Content Form */}
      <form className="relative z-10 min-h-screen ">
        {/* Upload Button */}
        <div className="absolute top-4 left-4 mb-4">
          <button
            type="button"
            onClick={() => bgImageRef.current.click()}
            className="bg-orange-600 text-white px-4 py-2 rounded shadow hover:bg-orange-700"
          >
            Upload Background
          </button>
          <input
            type="file"
            accept="image/*"
            ref={bgImageRef}
            hidden
            onChange={(e) => handleFileChange("bgImage", e)}
          />
        </div>

        <div className="p-4 text-[#ffb347] font-mono">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Game Logo */}
              <div className="text-center mt-12">
                <div className="inline-block relative w-full">
                  {pageData?.gameTitleImage ? (
                    <div className="relative">
                      <img
                        src={pageData.gameTitleImage.url}
                        alt="Game Title"
                        className="mx-auto w-full max-h-72 object-cover"
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded"
                        onClick={() =>
                          setPageData((prev) => ({ ...prev, gameTitleImage: null }))
                        }
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        className="text-6xl font-bold text-orange-400 mb-2 bg-transparent text-center outline-none"
                        style={{
                          textShadow: "3px 3px 0px #d97706, 6px 6px 0px #92400e",
                          WebkitTextStroke: "2px #ffffff",
                        }}
                        value={pageData.gameTitle}
                        onChange={(e) => handleChange("gameTitle", e)}
                      />
                      <div className="w-full h-1 bg-orange-400 rounded"></div>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={titleImageRef}
                    hidden
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setPageData((prev) => ({
                          ...prev,
                          gameTitleImage: { url: URL.createObjectURL(file), type: file.type },
                        }));
                      }
                    }}
                  />
                  <div className="mt-4 flex justify-center gap-4">
                    <button
                      type="button"
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
                      onClick={() => titleImageRef.current.click()}
                    >
                      Upload Title Image
                    </button>
                  </div>
                </div>
              </div>

              
            </div> 

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-slate-700 rounded-lg p-6">
                <input
                  type="text"
                  className="text-xl font-bold text-white bg-transparent outline-none w-full"
                  value={pageData.gameInfoTitle}
                  onChange={(e) => handleChange("gameInfoTitle", e)}
                />
                <textarea
                  className="text-slate-300 bg-transparent outline-none w-full mt-2"
                  value={pageData.gameInfoDescription}
                  onChange={(e) => handleChange("gameInfoDescription", e)}
                />
              </div>

              
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

export default App;