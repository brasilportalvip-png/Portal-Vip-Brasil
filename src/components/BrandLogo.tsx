import React, { useState } from 'react';
import { Sparkles, Globe } from 'lucide-react';
import { BRAND } from '../lib/brand';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
  subtitle?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  subtitle = 'Blog Oficial & Vitrine'
}) => {
  const [currentSrc, setCurrentSrc] = useState(BRAND.logoUrl);
  const [hasFailed, setHasFailed] = useState(false);

  const handleError = () => {
    if (currentSrc !== BRAND.remoteLogoUrl) {
      setCurrentSrc(BRAND.remoteLogoUrl);
    } else {
      setHasFailed(true);
    }
  };

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg',
    md: 'w-10 h-10 rounded-xl',
    lg: 'w-12 h-12 rounded-2xl',
    xl: 'w-16 h-16 rounded-2xl'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl'
  };

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div
        className={`relative ${sizeClasses[size]} p-[2px] bg-gradient-to-tr from-amber-400/80 via-yellow-300 to-amber-600 shadow-lg shadow-amber-500/25 shrink-0 overflow-hidden group`}
      >
        {!hasFailed ? (
          <img
            src={currentSrc}
            alt="Portal Vip Brasil"
            referrerPolicy="no-referrer"
            onError={handleError}
            className="w-full h-full object-contain rounded-[inherit] relative z-10 bg-slate-950/90 transition-transform duration-300 group-hover:scale-105"
            loading="eager"
          />
        ) : (
          <div className="w-full h-full bg-slate-950 rounded-[inherit] flex items-center justify-center text-amber-400 relative z-10">
            <Globe size={20} />
          </div>
        )}
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className={`font-black tracking-tight text-white flex items-center gap-1.5 ${textSizes[size]}`}>
            <span>Portal Vip</span>
            <span className="bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 bg-clip-text text-transparent">Brasil</span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-semibold text-amber-400/90 tracking-wider uppercase mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

