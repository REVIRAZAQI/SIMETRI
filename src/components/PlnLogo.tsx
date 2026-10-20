import React from 'react';

interface PlnLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  layout?: 'vertical' | 'horizontal';
  textColor?: string;
}

export const PlnLogo: React.FC<PlnLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  layout = 'vertical',
  textColor = 'text-[#00A0E9]'
}) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7', text: 'text-[10px]' },
    md: { box: 'w-9 h-9', text: 'text-xs' },
    lg: { box: 'w-12 h-12', text: 'text-sm' },
    xl: { box: 'w-16 h-16', text: 'text-lg' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex ${layout === 'vertical' ? 'flex-col items-center' : 'flex-row items-center gap-2'} shrink-0 select-none ${className}`}>
      {/* Yellow Box Logo Mark */}
      <div className={`${currentSize.box} bg-[#FFE800] rounded-md shadow-sm relative overflow-hidden flex items-center justify-center p-0.5 border border-yellow-300`}>
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 3 Blue Waves */}
          <path
            d="M 15 36 Q 32.5 28 50 36 T 85 36"
            stroke="#00A0E9"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 15 52 Q 32.5 44 50 52 T 85 52"
            stroke="#00A0E9"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M 15 68 Q 32.5 60 50 68 T 85 68"
            stroke="#00A0E9"
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
          />

          {/* Red Lightning Bolt */}
          <polygon
            points="54,12 68,38 52,40 64,56 40,88 47,54 36,52"
            fill="#E30613"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* PLN Text */}
      {showText && (
        <span className={`font-black tracking-widest leading-none ${textColor} ${currentSize.text}`}>
          PLN
        </span>
      )}
    </div>
  );
};
