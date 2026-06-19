  // context/AdContext.tsx

  import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
  } from "react";

  const BACKEND_URL =
    import.meta.env.VITE_BACKEND_URL;

  interface CachedAd {
    data: any;
    loaded: boolean;
  }

interface AdContextType {
  ad: CachedAd | null;
  preloadAd: () => Promise<void>;
  clearAd: () => void;
  adFetchCompleted: boolean;
}

  const AdContext = createContext<AdContextType | null>(
    null
  );

  export const AdProvider = ({
    children,
  }: {
    children: React.ReactNode;
  }) => {
    const [ad, setAd] = useState<CachedAd | null>(null);
const [adFetchCompleted, setAdFetchCompleted] = useState(false);
const loadingRef = useRef(false);

    const preloadAd = useCallback(async () => {
  if (ad || loadingRef.current) return;

  loadingRef.current = true;

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/prerollads/fairads`
    );

    if (!res.ok) {
      setAdFetchCompleted(true);
      return;
    }

    const adData = await res.json();

    // no ad inventory
    if (!adData?._id || !adData?.asset?.url) {
      setAdFetchCompleted(true);
      return;
    }

    const video = document.createElement("video");

    video.preload = "auto";
    video.src =
      adData.asset.processingStatus === "completed" &&
      adData.asset.optimizedUrl
        ? adData.asset.optimizedUrl
        : adData.asset.url;

    video.load();

    setAd({
      data: adData,
      loaded: true,
    });

    setAdFetchCompleted(true);
  } catch (err) {
    console.error("[Ads] preload failed", err);
    setAdFetchCompleted(true);
  } finally {
    loadingRef.current = false;
  }
}, [ad]);

    const clearAd = () => {
  setAd(null);
  setAdFetchCompleted(false);
};

    return (
      <AdContext.Provider
  value={{
    ad,
    preloadAd,
    clearAd,
    adFetchCompleted,
  }}
>
        {children}
      </AdContext.Provider>
    );
  };

  export const useAds = () => {
    const ctx = useContext(AdContext);

    if (!ctx) {
      throw new Error(
        "useAds must be inside AdProvider"
      );
    }

    return ctx;
  };