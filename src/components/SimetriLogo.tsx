import React from 'react';
import simetriLogoImg from '../assets/images/simetri_logo_1785543345931.jpg';

interface SimetriLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  layout?: 'vertical' | 'horizontal';
  textColor?: string;
}

export const SimetriLogo: React.FC<SimetriLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  layout = 'horizontal',
  textColor = 'text-white'
}) => {
  const sizeMap = {
    sm: { img: 'w-8 h-8 sm:w-9 sm:h-9', text: 'text-base sm:text-xl font-black' },
    md: { img: 'w-10 h-10 sm:w-12 sm:h-12', text: 'text-xl sm:text-2xl font-black' },
    lg: { img: 'w-16 h-16 sm:w-20 sm:h-20', text: 'text-2xl sm:text-3xl font-black' },
    xl: { img: 'w-24 h-24', text: 'text-3xl sm:text-4xl font-black' }
  };

  const currentSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex ${layout === 'vertical' ? 'flex-col items-center gap-2' : 'flex-row items-center gap-2 sm:gap-2.5'} min-w-0 select-none ${className}`}>
      {/* SIMETRI Logo Badge without white background */}
      <div className={`${currentSize.img} relative rounded-xl sm:rounded-2xl overflow-hidden shadow-md shadow-cyan-500/30 ring-1 ring-cyan-400/50 bg-slate-900 flex items-center justify-center shrink-0`}>
        <img
          src={simetriLogoImg}
          alt="Logo SIMETRI AI"
          className="w-full h-full object-cover object-center scale-105"
          referrerPolicy="no-referrer"
        />
      </div>

      {showText && (
        <div className={`min-w-0 ${layout === 'vertical' ? 'text-center' : 'text-left'}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`font-black tracking-tight uppercase leading-none bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent ${currentSize.text} ${textColor} truncate`}>
              SIMETR<span className="text-cyan-400">i</span>
            </span>
          </div>
          <span className="text-[8.5px] sm:text-[10px] font-extrabold text-cyan-400 tracking-wider block uppercase mt-0.5 opacity-90 truncate max-w-[125px] xs:max-w-[160px] sm:max-w-none">
            Sistem Ganti Meter Terintegrasi
          </span>
        </div>
      )}
    </div>
  );
};
