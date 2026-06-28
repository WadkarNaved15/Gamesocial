// context/AdContext.tsx

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL;

export interface CachedAd {
  data: any;
  loaded: boolean;
}

interface AdContextType {
  ads: CachedAd[];
  preloadAds: () => Promise<void>;
  clearAds: () => void;
  adFetchCompleted: boolean;
}

const AdContext =
  createContext<AdContextType | null>(null);

export const AdProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [ads, setAds] = useState<CachedAd[]>([]);
  const adsRef = useRef<CachedAd[]>([]);
  const [adFetchCompleted, setAdFetchCompleted] =
    useState(false);

  useEffect(() => {
  adsRef.current = ads;
}, [ads]);

  const loadingRef = useRef(false);

  const preloadAds = useCallback(async () => {
    if (
      adsRef.current.length ||
      loadingRef.current
    ) {
      return;
    }

    loadingRef.current = true;

    try {
      const res = await fetch(
        `${BACKEND_URL}/api/prerollads/fairads`
      );

      if (!res.ok) {
        setAdFetchCompleted(true);
        return;
      }

      const adList = await res.json();

      if (
        !Array.isArray(adList) ||
        adList.length === 0
      ) {
        setAdFetchCompleted(true);
        return;
      }

      const loadedAds: CachedAd[] = [];

      for (const adData of adList) {
        if (!adData?.asset?.url) continue;

        const video =
          document.createElement("video");

        video.preload = "auto";

        video.src =
          adData.asset.processingStatus ===
            "completed" &&
          adData.asset.optimizedUrl
            ? adData.asset.optimizedUrl
            : adData.asset.url;

        video.load();

        loadedAds.push({
          data: adData,
          loaded: true,
        });
      }

      setAds(loadedAds);
      setAdFetchCompleted(true);
    } catch (err) {
      console.error(
        "[Ads] preload failed",
        err
      );

      setAdFetchCompleted(true);
    } finally {
      loadingRef.current = false;
    }
  }, [ads]);

  const clearAds = useCallback(() => {
    setAds([]);
    setAdFetchCompleted(false);
  }, []);

  return (
    <AdContext.Provider
      value={{
        ads,
        preloadAds,
        clearAds,
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