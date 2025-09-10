import React, { useState, useRef ,useEffect} from "react";
import { Heart, Twitter, Facebook, Clock } from "lucide-react";

interface FileItem {
  id: number;
  title: string;
  size: string;
}

interface GameDetails {
  status: string;
  author: string;
  genre: string;
  tags: string;
}

interface GameTitleImage {
  url: string;
  type: string;
}

interface PageData {
  gameTitle: string;
  postTitle: string;
  postTag: string;
  postDate: string;
  author: string;
  italicQuote: string;
  bodyParagraph1: string;
  bodyParagraph2: string;
  bodyParagraph3: string;
  storeLink: string;
  closingQuote: string;
  signature: string;
  files: FileItem[];
  price: string;
  gameInfoTitle: string;
  gameInfoDescription: string;
  gameDetails: GameDetails;
  screenshots: string[];
  videos: string[];
  bgImage: string;
  gameTitleImage: GameTitleImage | null;
}

function App() {
  const [pageData, setPageData] = useState<PageData>({
    gameTitle: "GAME TITLE",
    postTitle: "Post Title",
    postTag: "Devlog",
    postDate: "1 day ago",
    author: "Author Name",
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
    gameInfoTitle: "Game Info Title",
    gameInfoDescription: "An excellent swashbuckling action-adventure for the C64!",
    gameDetails: {
      status: "Released",
      author: "Psytronik Software",
      genre: "Action, Adventure",
      tags: "Arcade, Commodore 64, Retro",
    },
    screenshots: [],
    videos: [],
    bgImage: "",
     gameTitleImage: null,
  });
    const [gradientColor, setGradientColor] = useState('0, 0, 0');
  const screenshot1Ref = useRef<HTMLInputElement | null>(null);
  const screenshot2Ref = useRef<HTMLInputElement | null>(null);
  const bgImageRef = useRef<HTMLInputElement | null>(null);
  const titleImageRef = useRef<HTMLInputElement | null>(null);

  const handleChange = (key: keyof PageData, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setPageData((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleColorChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Convert hex color to RGB and update the state
    const hex = event.target.value;
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
      setGradientColor(`${r}, ${g}, ${b}`)
  };



 const handleFileChange = (key: keyof PageData, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
            ? `linear-gradient(to right,   rgba(${gradientColor}, 1) 0%, 
              rgba(${gradientColor}, 0.8) 30%, 
              rgba(${gradientColor}, 0) 70%), url(${pageData.bgImage})`
            : `linear-gradient(to right, rgba(${gradientColor}, 1) 0%, 
              rgba(${gradientColor}, 0.8) 30%, 
              rgba(${gradientColor}, 0) 70%)`,
        }}
      ></div>
            <div className="absolute top-4 right-4 z-50">
        <label htmlFor="gradient-picker" className="text-sm font-semibold mr-2">
          Choose a shade:
        </label>
        <input 
          type="color" 
          id="gradient-picker" 
          defaultValue="#000000"
          onChange={handleColorChange}
        />
      </div>


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
                        className="mx-auto w-full max-h-72 object-contain"
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

              {/* Post Header */}
               <div className="mt-2 mb-6">
                <input
                  type="text"
                  className="text-3xl font-bold text-white mb-4 bg-transparent outline-none w-full"
                  value={pageData.postTitle}
                  onChange={(e) => handleChange("postTitle", e)}
                />
                <div className="flex items-center space-x-4 text-slate-400 mb-4">
                  <AutoWidthInput
                      value={pageData.gameInfoTitle}
                      spanClassName="absolute invisible whitespace-pre font-bold text-orange-400"
                      className="text-orange-400 bg-transparent outline-none font-bold"
                      onChange={(e) => handleChange("gameInfoTitle", e)}
                    />
                  <span>»</span>
                 <p className="bg-transparent outline-none">Devlog</p>
                </div>
                <div className="flex items-center space-x-6 mb-4">
                  <button type="button" className="flex items-center space-x-2 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded">
                    <Heart size={16} />
                    <span>Like</span>
                  </button>
                   <p className="text-slate-400 bg-transparent outline-none">1 day ago</p>
                  <span className="text-slate-400">by</span>
                  <AutoWidthInput
                      value={pageData.author}
                      spanClassName="absolute invisible whitespace-pre font-bold text-orange-400"
                      className="text-orange-400 bg-transparent outline-none font-bold"
                      onChange={(e) => handleChange("author", e)}
                    />
                </div>
                <div className="flex items-center space-x-4">
                 <span className="text-slate-400">Share this post:</span>
                 <button type="button" className="text-slate-400 hover:text-white">
                    <Twitter size={20} />
                  </button>
                  <button type="button" className="text-slate-400 hover:text-white">
                    <Facebook size={20} />
                  </button>
                </div>
              </div> 

             <div className="w-full h-[1px] bg-orange-400/40 rounded "></div>

            {/* Screenshots */}
          <div className="mt-8">
            <h3 className="text-2xl font-bold text-white mb-4">Screenshots</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pageData.screenshots.map((s, index) => (
                <div key={index} className="relative">
                  <img
                    src={s}
                    alt={`Screenshot ${index + 1}`}
                    className="rounded-lg shadow-md w-full h-48 object-contain"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs"
                    onClick={() => {
                      setPageData((prev) => ({
                        ...prev,
                        screenshots: prev.screenshots.filter((_, i) => i !== index),
                      }));
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
                onClick={() => screenshot1Ref.current.click()}
              >
                Upload Screenshot
              </button>
              <input
                type="file"
                accept="image/*"
                ref={screenshot1Ref}
                hidden
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  const newUrls = files.map((file) => URL.createObjectURL(file));
                  setPageData((prev) => ({
                    ...prev,
                    screenshots: [...prev.screenshots, ...newUrls],
                  }));
                }}
              />
            </div>
          </div>

            {/* Video Demo */}
            {/* Videos */}
          <div className="mt-8">
            <h3 className="text-2xl font-bold text-white mb-4">Video Demos</h3>

            <div className="grid grid-cols-1 gap-6">
              {pageData.videos.map((v, index) => (
                <div key={index} className="relative">
                  <video
                    src={v}
                    controls
                    className="rounded-lg shadow-md w-full max-h-96"
                  />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs"
                    onClick={() => {
                      setPageData((prev) => ({
                        ...prev,
                        videos: prev.videos.filter((_, i) => i !== index),
                      }));
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                type="button"
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
                onClick={() => screenshot2Ref.current.click()}
              >
                Upload Video
              </button>
              <input
                type="file"
                accept="video/*"
                ref={screenshot2Ref}
                hidden
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files);
                  const newUrls = files.map((file) => URL.createObjectURL(file));
                  setPageData((prev) => ({
                    ...prev,
                    videos: [...prev.videos, ...newUrls],
                  }));
                }}
              />
            </div>
          </div>


              {/* Blog Content */}
             <div className="prose prose-invert max-w-none mt-4 mb-8 space-y-4">
                <AutoResizeTextarea
                  value={pageData.italicQuote}
                  
                  onChange={(e) => handleChange("italicQuote", e)}

                  />
               {/*   <textarea
                  className="text-slate-300 leading-relaxed bg-transparent outline-none w-full"
                  value={pageData.bodyParagraph1}
                  onChange={(e) => handleChange("bodyParagraph1", e)}
                />
                <textarea
                  className="text-slate-300 leading-relaxed bg-transparent outline-none w-full"
                  value={pageData.bodyParagraph2}
                  onChange={(e) => handleChange("bodyParagraph2", e)}
                />
                <textarea
                  className="text-slate-300 leading-relaxed bg-transparent outline-none w-full"
                  value={pageData.bodyParagraph3}
                  onChange={(e) => handleChange("bodyParagraph3", e)}
                />*/}
                <input
                  type="url"
                  className="text-orange-400 underline bg-transparent outline-none w-full"
                  value={pageData.storeLink}
                  onChange={(e) => handleChange("storeLink", e)}
                />
                 <input
                  type="text"
                  className="text-slate-300 bg-transparent outline-none w-full"
                  value={pageData.closingQuote}
                  onChange={(e) => handleChange("closingQuote", e)}
                />
               <input
                  type="text"
                  className="text-slate-300 bg-transparent outline-none w-full"
                  value={pageData.signature}
                  onChange={(e) => handleChange("signature", e)}
                />
              </div> 

              {/* Files */}
             <div className="mb-8">
                <h3 className="text-2xl font-bold text-white mb-6">Files</h3>
                <div className="space-y-4">
                  {pageData.files.map((file, index) => (
                    <div key={file.id} className="bg-slate-700 rounded-lg p-4 flex justify-between">
                      <AutoWidthInput                        
                        value={file.title}
                        spanClassName="absolute invisible whitespace-pre font-bold "
                        className="bg-transparent outline-none font-bold text-gray-400"
                        onChange={(e) => {
                          const newFiles = [...pageData.files];
                          newFiles[index].title = e.target.value;
                          setPageData({ ...pageData, files: newFiles });
                        }}
                      />
                    {/*  <input
                        type="text"
                        className="text-slate-400 bg-transparent outline-none"
                        value={file.size}
                        onChange={(e) => {
                          const newFiles = [...pageData.files];
                          newFiles[index].size = e.target.value;
                          setPageData({ ...pageData, files: newFiles });
                        }}
                      />*/}
                    </div>
                  ))}
                </div>
              </div> 

              {/* Purchase Section */}
              {/* <div className="bg-slate-700 rounded-lg p-6">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Get {pageData.gameInfoTitle}
                </h3>
                <div className="flex items-center space-x-4">
                  <button type="button" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded font-semibold">
                    Buy Now
                  </button>
                  <div className="text-white">
                    <input
                      type="text"
                      className="text-2xl font-bold bg-transparent outline-none w-40"
                      value={pageData.price}
                      onChange={(e) => handleChange("price", e)}
                    />
                    <span className="text-slate-400 ml-2">or more</span>
                  </div>
                </div>
              </div>*/}
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

interface AutoWidthInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string; // custom classes
  spanClassName?: string; // custom classes for measuring span (for font consistency)
  minWidth?: number; // optional minimum width
  padding?: number; // optional padding to add
}

const AutoWidthInput: React.FC<AutoWidthInputProps> = ({
  value,
  onChange,
  className = "",
  spanClassName = "",
  minWidth = 20,
  padding = 20,
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | string>(minWidth);

  useEffect(() => {
    if (spanRef.current) {
      const textWidth = spanRef.current.offsetWidth + padding;

      if (typeof minWidth === "number") {
        // px-based logic
        setWidth(Math.max(textWidth, minWidth));
      } else {
        // % or other string-based minWidth → keep string
        setWidth(textWidth < 1 ? minWidth : textWidth);
      }
    }
  }, [value, padding, minWidth]);

  return (
    <div className="inline-block relative">
      {/* Hidden span to measure text width */}
      <span
        ref={spanRef}
        className={`absolute invisible whitespace-pre ${spanClassName}`}
      >
        {value || " "}
      </span>

      <input
        type="text"
        className={className}
        value={value}
        onChange={onChange}
        style={{ width }}
      />
    </div>
  );
};



                

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}> = ({ value, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"; // reset first
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      className="text-xl text-slate-300 bg-transparent outline-none w-full resize-none overflow-hidden"
      value={value}
      onChange={onChange}
    />
  );
};



export default App;