import React from 'react';
import { Link } from 'react-router-dom';

interface BrandLogoProps {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'light',
  size = 'md',
  showText = true,
}) => {
  const isDark = variant === 'dark';

  const logoSizes = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12 sm:h-14 sm:w-14',
    lg: 'h-16 w-16 sm:h-20 sm:w-20',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg sm:text-xl',
    lg: 'text-2xl',
  };

  // Direct reference to the authentic uploaded logo image file
  const logoPath = '/assets/aistudio/Remove_background_and_make_white_2K_20261026140301_cb58c5fb.jpg';

  return (
    <Link to="/" className="inline-flex items-center gap-3 group select-none">
      {/* Authentic Original Logo Image */}
      <div
        className={`relative flex items-center justify-center overflow-hidden transition-transform duration-200 group-hover:scale-105 rounded-xl ${
          isDark
            ? 'bg-white p-1 border-2 border-[#C9A34E] shadow-md'
            : 'bg-white p-0.5 border border-[#E8E5DD] shadow-sm'
        }`}
      >
        <img
          src={logoPath}
          alt="Sentra Property Jember"
          className={`${logoSizes[size]} object-contain rounded-lg`}
          loading="eager"
        />
      </div>

      {showText && (
        <div className="flex flex-col leading-none">
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-black tracking-wider ${textSizes[size]}`}
              style={{ color: isDark ? '#FFFFFF' : '#142544' }}
            >
              SENTRA
            </span>
            <span
              className={`font-bold tracking-widest ${textSizes[size]}`}
              style={{ color: '#C9A34E' }}
            >
              PROPERTY
            </span>
          </div>
          <span
            className="text-[10px] uppercase tracking-widest font-semibold mt-1"
            style={{ color: isDark ? '#E0C477' : '#6B7280' }}
          >
            Jember • Jawa Timur
          </span>
        </div>
      )}
    </Link>
  );
};
