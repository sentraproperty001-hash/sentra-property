import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Property } from '../../types';
import { MapPin, Bed, Bath, Maximize2, Building, ArrowRight } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
}

export const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const [imageError, setImageError] = useState(false);

  // Format IDR currency
  const formatRupiah = (val: number, isSewa: boolean) => {
    const formatted = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
    return isSewa ? `${formatted} / thn` : formatted;
  };

  const isRent = property.listing_type === 'sewa';

  return (
    <div className="group bg-white rounded-xl overflow-hidden border border-[#E8E5DD] shadow-[0_2px_12px_rgba(20,37,68,0.06)] hover:shadow-[0_8px_24px_rgba(20,37,68,0.12)] hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      {/* Image Container with Badges */}
      <div className="relative aspect-[16/10] overflow-hidden bg-[#142544]/5">
        {property.image && !imageError ? (
          <img
            src={property.image}
            alt={property.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#142544] to-[#0B1730] text-[#D8C596] p-4 text-center">
            <Building className="w-10 h-10 mb-2 opacity-80" />
            <span className="text-xs font-medium tracking-wide">Sentra Property Jember</span>
          </div>
        )}

        {/* Gradient overlay for contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 pointer-events-none" />

        {/* Transaction Badge */}
        <div className="absolute top-3 left-3 flex gap-2">
          <span
            className={`text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-md shadow-sm ${
              isRent
                ? 'bg-[#B49453] text-[#0B1730]'
                : 'bg-[#142544] text-white border border-[#B49453]/40'
            }`}
          >
            {isRent ? 'Disewakan' : 'Dijual'}
          </span>
          <span className="text-[11px] font-medium capitalize px-2.5 py-1 rounded-md bg-white/95 text-[#142544] shadow-sm backdrop-blur-sm">
            {property.property_type}
          </span>
        </div>

        {/* City/District Pill */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs font-medium">
          <span className="inline-flex items-center gap-1 drop-shadow-md">
            <MapPin className="w-3.5 h-3.5 text-[#D8C596]" />
            <span className="truncate">{property.district}, Jember</span>
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Price */}
        <div className="mb-2">
          <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wider block">
            Harga Penawaran
          </span>
          <span className="text-xl font-semibold text-[#142544] tracking-tight">
            {formatRupiah(property.price, isRent)}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-base text-[#142544] line-clamp-1 mb-1.5 group-hover:text-[#B49453] transition-colors">
          {property.title}
        </h3>

        {/* Address */}
        <p className="text-xs text-[#6B7280] line-clamp-1 mb-4 flex items-center gap-1">
          <span>{property.address}</span>
        </p>

        {/* Key Specs Row */}
        <div className="grid grid-cols-4 gap-2 py-3 border-y border-[#E8E5DD] text-[#142544] text-xs mt-auto mb-4 bg-[#F8F7F3]/70 rounded-lg px-2">
          <div className="flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-[#6B7280] flex items-center gap-0.5">
              <Bed className="w-3 h-3 text-[#B49453]" /> KT
            </span>
            <span className="font-medium mt-0.5">{property.bedrooms > 0 ? property.bedrooms : '-'}</span>
          </div>

          <div className="flex flex-col items-center justify-center text-center border-l border-[#E8E5DD]">
            <span className="text-[10px] text-[#6B7280] flex items-center gap-0.5">
              <Bath className="w-3 h-3 text-[#B49453]" /> KM
            </span>
            <span className="font-medium mt-0.5">{property.bathrooms > 0 ? property.bathrooms : '-'}</span>
          </div>

          <div className="flex flex-col items-center justify-center text-center border-l border-[#E8E5DD]">
            <span className="text-[10px] text-[#6B7280] flex items-center gap-0.5">
              <Maximize2 className="w-3 h-3 text-[#B49453]" /> LT
            </span>
            <span className="font-medium mt-0.5">{property.land_area ? `${property.land_area}m²` : '-'}</span>
          </div>

          <div className="flex flex-col items-center justify-center text-center border-l border-[#E8E5DD]">
            <span className="text-[10px] text-[#6B7280] flex items-center gap-0.5">
              <Building className="w-3 h-3 text-[#B49453]" /> LB
            </span>
            <span className="font-medium mt-0.5">{property.building_area ? `${property.building_area}m²` : '-'}</span>
          </div>
        </div>

        {/* Action Button */}
        <Link
          to={`/detail/${property.slug}`}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#142544] hover:bg-[#0B1730] text-white font-semibold text-xs tracking-wide transition-all duration-200 border border-[#142544] group-hover:border-[#B49453] shadow-sm hover:shadow"
        >
          <span>Lihat Detail Lengkap</span>
          <ArrowRight className="w-3.5 h-3.5 text-[#B49453] group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
};
