// src/components/post/components/BackgroundControls.tsx
import React from 'react';
import { Palette, ZoomIn } from 'lucide-react';

export type BgType = 'solid' | 'gradient' | 'focus' | 'stripes' | 'spotlight';

interface Asset {
  backgroundColor?: string;
  backgroundGradient?: string;
  fieldOfView?: string;
}

interface BackgroundControlsProps {
  activeAsset: Asset | undefined;
  bgType: BgType;
  gradientColor1: string;
  gradientColor2: string;
  onBgTypeChange: (type: BgType) => void;
  onSolidColorChange: (color: string) => void;
  onGradientChange: (c1: string, c2: string) => void;
  onFocusGradientChange: (c1: string, c2: string) => void;
  onStripesGradientChange: (c1: string, c2: string) => void;
  onZoomChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onGradientColor1Change: (color: string) => void;
  onGradientColor2Change: (color: string) => void;
  onSpotlightGradientChange: (c1: string, c2: string) => void;
}

export const BackgroundControls: React.FC<BackgroundControlsProps> = ({
  activeAsset,
  bgType,
  gradientColor1,
  gradientColor2,
  onBgTypeChange,
  onSolidColorChange,
  onGradientChange,
  onFocusGradientChange,
  onStripesGradientChange,
  onSpotlightGradientChange,
  onZoomChange,
  onGradientColor1Change,
  onGradientColor2Change,
}) => {
  return (
    <div className="flex flex-col gap-3 p-3 bg-gray-50 dark:bg-white/[0.02] rounded-xl border border-gray-200 dark:border-white/[0.06]">
      {/* Zoom Controller */}
      <div className="flex items-center gap-4">
        <ZoomIn size={18} className="text-gray-400" />
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between text-xs font-semibold text-gray-500">
            <span>Zoomed In</span>
            <span>Zoomed Out</span>
          </div>
          <input
            type="range"
            min="1"
            max="90"
            value={
              activeAsset?.fieldOfView === 'auto'
                ? 45
                : parseInt(activeAsset?.fieldOfView || '45')
            }
            onChange={onZoomChange}
            className="w-full accent-[#3D7A6E] cursor-pointer"
          />
        </div>
      </div>

      {/* <hr className="border-gray-200 dark:border-white/[0.06]" /> */}

      {/* Background Modes Section */}
      {/* <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <Palette size={16} />
            <span>Background Style</span>
          </div>

          <div className="flex items-center bg-gray-200 dark:bg-white/[0.06] p-0.5 rounded-lg text-xs">
            <button
              type="button"
              onClick={() => onBgTypeChange('solid')}
              className={`px-2 py-0.5 rounded-md transition ${bgType === 'solid'
                ? 'bg-white dark:bg-zinc-800 font-bold text-black dark:text-white shadow-sm'
                : 'text-gray-500'
                }`}
            >
              Solid
            </button>
            <button
              type="button"
              onClick={() => onBgTypeChange('gradient')}
              className={`px-2 py-0.5 rounded-md transition ${bgType === 'gradient'
                ? 'bg-white dark:bg-zinc-800 font-bold text-black dark:text-white shadow-sm'
                : 'text-gray-500'
                }`}
            >
              Gradient
            </button>
            <button
              type="button"
              onClick={() => onBgTypeChange('focus')}
              className={`px-2 py-0.5 rounded-md transition ${bgType === 'focus'
                ? 'bg-white dark:bg-zinc-800 font-bold text-black dark:text-white shadow-sm'
                : 'text-gray-500'
                }`}
            >
              Focus
            </button>
            <button
              type="button"
              onClick={() => onBgTypeChange('stripes')}
              className={`px-2 py-0.5 rounded-md transition ${bgType === 'stripes'
                ? 'bg-white dark:bg-zinc-800 font-bold text-black dark:text-white shadow-sm'
                : 'text-gray-500'
                }`}
            >
              Stripes
            </button>
            <button
              type="button"
              onClick={() => onBgTypeChange('spotlight')}
              className={`px-2 py-0.5 rounded-md transition ${bgType === 'spotlight'
                ? 'bg-[#3D7A6E] font-bold text-white shadow-sm'
                : 'text-gray-500'
                }`}
            >
              Spotlight
            </button>
          </div>
        </div>

        {bgType === 'solid' ? (
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={
                activeAsset?.backgroundColor &&
                  activeAsset.backgroundColor.startsWith('#')
                  ? activeAsset.backgroundColor
                  : '#ffffff'
              }
              onChange={(e) => onSolidColorChange(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
            />
            <span className="text-xs text-gray-500 font-mono">
              {activeAsset?.backgroundColor || 'Transparent'}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={gradientColor1}
                onChange={(e) => {
                  const val = e.target.value;
                  onGradientColor1Change(val);
                  if (bgType === 'focus') {
                    onFocusGradientChange(val, gradientColor2);
                  } else if (bgType === 'stripes') {
                    onStripesGradientChange(val, gradientColor2);
                  } else if (bgType === 'spotlight') {
                    onSpotlightGradientChange(val, gradientColor2);
                  } else {
                    onGradientChange(val, gradientColor2);
                  }
                }}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-gray-500">Center / Primary</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={gradientColor2}
                onChange={(e) => {
                  const val = e.target.value;
                  onGradientColor2Change(val);
                  if (bgType === 'focus') {
                    onFocusGradientChange(gradientColor1, val);
                  } else if (bgType === 'stripes') {
                    onStripesGradientChange(gradientColor1, val);
                  } else if (bgType === 'spotlight') {
                    onSpotlightGradientChange(gradientColor1, val);
                  } else {
                    onGradientChange(gradientColor1, val);
                  }
                }}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <span className="text-xs text-gray-500">Top & Bottom</span>
            </div>
          </div>
        )}
      </div> */}
    </div>
  );
};