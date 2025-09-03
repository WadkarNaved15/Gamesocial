import React, { useState, useRef, useEffect } from "react";

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  audioUrl: string;
}

 const Music: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0); // Track volume state
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentSong: Song = {
    id: "1",
    title: "Midnight Dreams",
    artist: "Luna Echo",
    thumbnail: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&q=80",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
  };

  return (
    <div
      className={`fixed bottom-4 left-0  z-50 transition-all duration-300 flex justify-center items-end ${
        isExpanded ? "ml-4" : "ml-2"
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      {/* Volume Slider */}
      <div
        className={`transition-all duration-300 ${
          isExpanded ? "opacity-100 justify-center w-4 h-8 mr-2" : "opacity-0 w-0 h-0"
        }`}
      >
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 rounded-lg appearance-none cursor-pointer bg-gray-700 -rotate-90 origin-bottom"
          />
        </div>
      </div>

      {/* Player Container */}
      <div
        className={`transition-all duration-300 flex ${
          isExpanded ? "h-full pr-2 dark:bg-gray-700 bg-black/80 backdrop-blur-lg rounded-lg " : ""
        }`}
      >
        <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-xl relative flex-shrink-0 ${!isExpanded ? 'dark:bg-gray-700' : ''}`}>
            <img
              src={currentSong.thumbnail}
              alt={currentSong.title}
              className="w-12 h-12 rounded object-cover"
            />
            <button
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center rounded transition-colors"
            >
              <i className={`fas ${isPlaying ? "fa-pause" : "fa-play"} text-white`}></i>
            </button>
          </div>

          <div className={`transition-all duration-300 ${isExpanded ? "opacity-100 w-auto" : "opacity-0 w-0 overflow-hidden"}`}>
            <h3 className="text-white text-sm font-medium truncate">{currentSong.title}</h3>
            <p className="dark:text-white text-gray-400 text-xs truncate">{currentSong.artist}</p>
          </div>
        </div>
      </div>

      <audio ref={audioRef} src={currentSong.audioUrl} loop />
    </div>
  );
};

export default Music;