import {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export const AudioProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isMuted, setIsMuted] = useState(() => {
    const saved = localStorage.getItem("rigzer_muted");
    return saved === null ? true : saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("rigzer_muted", String(isMuted));
  }, [isMuted]);

  return (
    <AudioContext.Provider
      value={{
        isMuted,
        toggleMute: () => setIsMuted((m) => !m),
      }}
    >
      {children}
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const ctx = useContext(AudioContext);

  if (!ctx) {
    throw new Error("useAudio must be used inside AudioProvider");
  }

  return ctx;
};