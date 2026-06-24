import React from 'react';

const ExternalLinkIcon = ({ className = 'h-5 w-auto' }) => {
  return (
    <svg
      viewBox="0 0 110 85"
      className={`${className} fill-current text-white`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 1. Main Ad Screen with an explicit cut-out gap at the bottom right */}
      <path
        d="M 80 64 
           L 16 64 
           A 12 12 0 0 1 4 52 
           L 4 16 
           A 12 12 0 0 1 16 4 
           L 94 4 
           A 12 12 0 0 1 106 16 
           L 106 44"
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeLinecap="round"
      />
      
      {/* 2. Central AD Text - Shifted left to balance the layout */}
      <text
        x="44"
        y="35"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontWeight="900"
        fontSize="34px"
        fill="currentColor"
        letterSpacing="-0.03em"
      >
        AD
      </text>

      {/* 3. The Mouse Cursor - Perfectly positioned inside the gap */}
      <path 
        d="M 68 34 
           L 104 53 
           L 89 59 
           L 99 79 
           L 87 84 
           L 77 64 
           L 68 70 
           Z" 
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default ExternalLinkIcon;