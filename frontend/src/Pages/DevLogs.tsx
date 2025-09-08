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
      "Some free bonus extra content has now been added to the Musketeer download bundle. It now also contains a promo advert image for the game along with the official game manual as a .pdf file (containing some gameplay hints!)",
    bodyParagraph2:
      "The complete soundtrack from the game is also available to enjoy in high-quality mp3 format. The music has been digitally recorded from a real C64 in the Psytronik studio.",
    bodyParagraph3:
      "Also, some good news for people interested in obtaining a physical edition of the game. Due to popular demand the stock levels of the physical edition are running low so we have decided to do another production run to meet demand. You can pre-order the physical editions of Musketeer from the official Psytronik store:-",
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
      tags: "Arcade, Commodore 64, goonies, Retro, swordfight, zorro",
    },
    screenshot1:
      "https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=600",
    screenshot2:
      "https://images.pexels.com/photos/1293261/pexels-photo-1293261.jpeg?auto=compress&cs=tinysrgb&w=600",
  });

  const screenshot1Ref = useRef(null);
  const screenshot2Ref = useRef(null);

  // update helper for nested objects
  const updateNestedField = (obj, path, value) => {
    const keys = path.split(".");
    const newObj = { ...obj };
    let curr = newObj;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) {
        curr[k] = value;
      } else {
        curr[k] = { ...curr[k] };
        curr = curr[k];
      }
    });
    return newObj;
  };

  const handleTextChange = (key, e) => {
    const value = e.currentTarget.textContent;
    setPageData((prev) => updateNestedField(prev, key, value));
  };

  const handleImageChange = (key, e) => {
    const file = e.target.files[0];
    if (file) {
      const newImageUrl = URL.createObjectURL(file);
      setPageData((prev) => ({ ...prev, [key]: newImageUrl }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Game Logo */}
            <div className="text-center mb-8">
              <div className="inline-block">
                <h1
                  className="text-6xl font-bold text-orange-400 mb-2"
                  style={{
                    textShadow: "3px 3px 0px #d97706, 6px 6px 0px #92400e",
                    WebkitTextStroke: "2px #ffffff",
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange("gameTitle", e)}
                >
                  {pageData.gameTitle}
                </h1>
                <div className="w-full h-1 bg-orange-400 rounded"></div>
              </div>
            </div>

            {/* Post Header */}
            <div className="mb-6">
              <h2
                className="text-3xl font-bold text-white mb-4"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => handleTextChange("postTitle", e)}
              >
                {pageData.postTitle}
              </h2>
              <div className="flex items-center space-x-4 text-slate-400 mb-4">
                <a href="#" className="text-orange-400 hover:text-orange-300">
                  {pageData.gameInfoTitle}
                </a>
                <span>»</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange("postTag", e)}
                >
                  {pageData.postTag}
                </span>
              </div>
              <div className="flex items-center space-x-6 mb-4">
                <button className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded">
                  <Heart size={16} />
                  <span>Like</span>
                </button>
                <span
                  className="text-slate-400"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange("postDate", e)}
                >
                  {pageData.postDate}
                </span>
                <span className="text-slate-400"> by </span>
                <a
                  href="#"
                  className="text-orange-400 hover:text-orange-300"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange("author", e)}
                >
                  {pageData.author}
                </a>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-slate-400">Share this post:</span>
                <button className="text-slate-400 hover:text-white">
                  <Twitter size={20} />
                </button>
                <button className="text-slate-400 hover:text-white">
                  <Facebook size={20} />
                </button>
              </div>
            </div>

            {/* Screenshots */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div
                className="aspect-video bg-slate-700 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => screenshot1Ref.current.click()}
              >
                <img
                  src={pageData.screenshot1}
                  alt="Game Screenshot 1"
                  className="w-full h-full object-cover"
                />
                <input
                  type="file"
                  hidden
                  ref={screenshot1Ref}
                  onChange={(e) => handleImageChange("screenshot1", e)}
                />
              </div>
              <div
                className="aspect-video bg-slate-700 rounded-lg overflow-hidden cursor-pointer"
                onClick={() => screenshot2Ref.current.click()}
              >
                <img
                  src={pageData.screenshot2}
                  alt="Game Screenshot 2"
                  className="w-full h-full object-cover"
                />
                <input
                  type="file"
                  hidden
                  ref={screenshot2Ref}
                  onChange={(e) => handleImageChange("screenshot2", e)}
                />
              </div>
            </div>

            {/* Blog Content */}
            <div className="prose prose-invert max-w-none mb-8">
              {[
                ["italicQuote", "text-xl italic text-slate-300 mb-6"],
                ["bodyParagraph1", "text-slate-300 leading-relaxed mb-6"],
                ["bodyParagraph2", "text-slate-300 leading-relaxed mb-6"],
                ["bodyParagraph3", "text-slate-300 leading-relaxed mb-6"],
              ].map(([key, cls]) => (
                <p
                  key={key}
                  className={cls}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange(key, e)}
                >
                  {pageData[key]}
                </p>
              ))}
              <p className="mb-6">
                <a
                  href="#"
                  className="text-orange-400 hover:text-orange-300 underline"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange("storeLink", e)}
                >
                  {pageData.storeLink}
                </a>
              </p>
              <p
                className="text-slate-300 mb-4"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => handleTextChange("closingQuote", e)}
              >
                {pageData.closingQuote}
              </p>
              <p
                className="text-slate-300"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => handleTextChange("signature", e)}
              >
                {pageData.signature}
              </p>
            </div>

            {/* Files Section */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-white mb-6">Files</h3>
              <div className="space-y-4">
                {pageData.files.map((file, index) => (
                  <div key={file.id} className="bg-slate-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4
                          className="text-white font-semibold"
                          contentEditable
                          suppressContentEditableWarning
                          onInput={(e) => {
                            const newFiles = [...pageData.files];
                            newFiles[index].title =
                              e.currentTarget.textContent;
                            setPageData({ ...pageData, files: newFiles });
                          }}
                        >
                          {file.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-slate-400 text-sm mt-1">
                          <Clock size={14} />
                          <span>{pageData.postDate}</span>
                        </div>
                      </div>
                      <span
                        className="text-slate-400"
                        contentEditable
                        suppressContentEditableWarning
                        onInput={(e) => {
                          const newFiles = [...pageData.files];
                          newFiles[index].size =
                            e.currentTarget.textContent;
                          setPageData({ ...pageData, files: newFiles });
                        }}
                      >
                        {file.size}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Purchase Section */}
            <div className="bg-slate-700 rounded-lg p-6">
              <h3 className="text-2xl font-bold text-white mb-4">
                Get Musketeer (C64)
              </h3>
              <div className="flex items-center space-x-4">
                <button className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded font-semibold">
                  Buy Now
                </button>
                <div className="text-white">
                  <span
                    className="text-2xl font-bold"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => handleTextChange("price", e)}
                  >
                    {pageData.price}
                  </span>
                  <span className="text-slate-400 ml-2">or more</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-slate-700 rounded-lg p-6">
              <h3
                className="text-xl font-bold text-white mb-4"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => handleTextChange("gameInfoTitle", e)}
              >
                {pageData.gameInfoTitle}
              </h3>
              <p
                className="text-slate-300 mb-4"
                contentEditable
                suppressContentEditableWarning
                onInput={(e) => handleTextChange("gameInfoDescription", e)}
              >
                {pageData.gameInfoDescription}
              </p>
            </div>

            {/* Game Details */}
            <div className="bg-slate-700 rounded-lg p-6 text-sm space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span
                  className="text-orange-400"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange("gameDetails.status", e)}
                >
                  {pageData.gameDetails.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Author</span>
                <span
                  className="text-orange-400"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange("gameDetails.author", e)}
                >
                  {pageData.gameDetails.author}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Genre</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange("gameDetails.genre", e)}
                >
                  {pageData.gameDetails.genre}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-400">Tags</span>
                <span
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => handleTextChange("gameDetails.tags", e)}
                >
                  {pageData.gameDetails.tags}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
