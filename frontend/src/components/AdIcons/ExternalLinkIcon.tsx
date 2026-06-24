import React from 'react';

const ExternalLinkIcon = ({ className = 'h-5 w-auto' }) => {
  return (
    <svg
      viewBox="0 0 76 24"
      className={`${className} fill-current text-current`}
      stroke="currentColor"
      strokeWidth="0"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* 1. The Arrow Box Container (Shifted left slightly for tight margins) */}
      <g transform="translate(1, 1)">
        {/* The rounded outer square */}
        <rect 
          x="0" 
          y="0" 
          width="22" 
          height="22" 
          rx="5" 
          ry="5" 
          fill="none" 
          strokeWidth="2.5" 
        />
        {/* The diagonal arrow line */}
        <line x1="6" y1="16" x2="16" y2="6" strokeWidth="3.5" />
        {/* The arrow head pointing top-right */}
        <polyline points="10 6 16 6 16 12" strokeWidth="3.5" fill="none" />
      </g>

      {/* 2. The "Ads" Text inside the SVG */}
      <text
        x="32"
        y="20"
        fontFamily="ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="800"
        fontSize="20px"
        letterSpacing="0.02em"
      >
        Ads
      </text>
    </svg>
  );
};

export default ExternalLinkIcon;