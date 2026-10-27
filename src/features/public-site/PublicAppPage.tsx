import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { Property } from '@/src/types';
import { BUSINESS_CONFIG } from '@/src/lib/constants';
import { readPublicAppFavorites, writePublicAppFavorites } from './publicAppFavorites';
import { loadPublicAppProperties } from './publicAppSampleProperties';
import { PWAInstallButton } from '@/src/components/PWAInstallButton';
import { Building, Heart, MapPin, MessageCircle, Search, SlidersHorizontal, X } from 'lucide-react';

type ListingTypeFilter = 'semua' | 'jual' | 'sewa';
type PropertyTypeFilter = 'semua' | Property['property_type'];
type PriceFilter = 'semua' | 'under-500m' | '500m-1b' | 'above-1b';

const priceFilters: { value: PriceFilter; label: string; minPrice?: number; maxPrice?: number }[] = [
  { value: 'semua', label: 'Semua harga' },
  { value: 'under-500m', label: '< Rp500 jt', maxPrice: 500_000_000 },
  { value: '500m-1b', label: 'Rp500 jt–1 M', minPrice: 500_000_000, maxPrice: 1_000_000_000 },
  { value: 'above-1b', label: '> Rp1 M', minPrice: 1_000_000_000 },
];

const formatRupiah = (price: number, isRent: boolean) => {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price);
  return isRent ? `${formatted} / thn` : formatted;
};

const MobilePropertyCard: React.FC<{
  property: Property;
  detailPath: string;
  isFavorite: boolean;
  isSample: boolean;
  onToggleFavorite: (propertyId: string) => void;
}> = ({ property, detailPath, isFavorite, isSample, onToggleFavorite }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const isRent = property.listing_type === 'sewa';

  return (
    <article className="flex overflow-hidden rounded-2xl border border-[#E8E5DD] bg-white shadow-sm">
      <Link to={detailPath} className="relative block w-[38%] min-w-28 bg-[#142544]">
          {property.image && !imageFailed ? (
            <img
              src={property.image}
              alt={property.title}
              onError={() => setImageFailed(true)}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#D8C596]">
              <Building className="h-7 w-7" />
              <span className="px-2 text-center text-[10px] font-medium">Foto belum tersedia</span>
            </div>
          )}
          <span className="absolute left-2 top-2 rounded-md bg-white px-2 py-1 text-[10px] font-bold capitalize text-[#142544] shadow">
            {isRent ? 'Sewa' : 'Jual'}
          </span>
          {isSample && (
            <span className="absolute bottom-2 left-2 rounded-md bg-[#B49453] px-2 py-1 text-[9px] font-bold text-[#142544]">
              CONTOH
            </span>
          )}
      </Link>
      <div className="min-w-0 flex-1 p-3">
        <div className="flex items-start justify-between gap-2">
          <Link to={detailPath} className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-[#142544]">{formatRupiah(property.price, isRent)}</p>
            <h2 className="mt-1 line-clamp-2 text-xs font-semibold leading-snug text-[#142544]" style={{ fontWeight: 700 }}>{property.title}</h2>
          </Link>
          <button
            type="button"
            onClick={() => onToggleFavorite(property.id)}
            aria-label={isFavorite ? 'Hapus dari favorit' : 'Simpan ke favorit'}
            aria-pressed={isFavorite}
            className="shrink-0 rounded-full p-1.5 text-[#B49453] hover:bg-[#B49453]/10"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
        <Link to={detailPath} className="block">
          <p className="mt-2 flex items-center gap-1 text-[11px] text-[#6B7280]">
            <MapPin className="h-3 w-3 shrink-0 text-[#B49453]" />
            <span className="truncate">{property.district}, Jember</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 border-t border-[#E8E5DD] pt-2 text-[10px] text-[#6B7280]">
            <span>LT {property.land_area ? `${property.land_area} m²` : '—'}</span>
            {property.bedrooms > 0 && <span>{property.bedrooms} KT</span>}
            <span className="font-bold text-[#142544]">Detail →</span>
          </div>
        </Link>
      </div>
    </article>
  );
};

export const PublicAppPage: React.FC<{ basePath?: string }> = ({ basePath = '' }) => {
  const [publishedProperties, setPublishedProperties] = useState<Property[]>([]);
  const [isSampleData, setIsSampleData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [listingType, setListingType] = useState<ListingTypeFilter>('semua');
  const [propertyType, setPropertyType] = useState<PropertyTypeFilter>('semua');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('semua');
  const [bedrooms, setBedrooms] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(readPublicAppFavorites);
  const [activeNavigation, setActiveNavigation] = useState<'home' | 'properties' | 'favorites' | 'contact'>('home');

  useEffect(() => {
    let isActive = true;

    loadPublicAppProperties()
      .then(({ properties, isSampleData: usingSampleData }) => {
        if (isActive) {
          setPublishedProperties(properties);
          setIsSampleData(usingSampleData);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : 'Gagal memuat listing properti.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (showFavorites) return;

    const updateActiveSection = () => {
      const propertiesSection = document.getElementById('properties');
      setActiveNavigation(
        propertiesSection && propertiesSection.getBoundingClientRect().top <= 150
          ? 'properties'
          : 'home'
      );
    };

    window.addEventListener('scroll', updateActiveSection, { passive: true });
    updateActiveSection();
    return () => window.removeEventListener('scroll', updateActiveSection);
  }, [showFavorites]);

  const activePriceFilter = priceFilters.find((filter) => filter.value === priceFilter);
  const visibleProperties = useMemo(() => {
    const filtered = propertyRepository.filterPublished(publishedProperties, {
      query: showFavorites ? undefined : query.trim() || undefined,
      listingType: showFavorites || listingType === 'semua' ? undefined : listingType,
      propertyType: showFavorites || propertyType === 'semua' ? undefined : propertyType,
      minPrice: showFavorites ? undefined : activePriceFilter?.minPrice,
      maxPrice: showFavorites ? undefined : activePriceFilter?.maxPrice,
      bedrooms: showFavorites ? undefined : bedrooms || undefined,
      sort: 'newest',
    });
    return showFavorites ? filtered.filter((property) => favoriteIds.includes(property.id)) : filtered;
  }, [publishedProperties, query, listingType, propertyType, activePriceFilter, bedrooms, showFavorites, favoriteIds]);

  const visibleFavoriteCount = publishedProperties.filter((property) => favoriteIds.includes(property.id)).length;
  const activeFilterCount = [
    propertyType !== 'semua',
    priceFilter !== 'semua',
    bedrooms > 0,
  ].filter(Boolean).length;

  const toggleFavorite = (propertyId: string) => {
    setFavoriteIds((current) => {
      const updated = current.includes(propertyId)
        ? current.filter((id) => id !== propertyId)
        : [...current, propertyId];
      writePublicAppFavorites(updated);
      return updated;
    });
  };

  const resetFilters = () => {
    setQuery('');
    setListingType('semua');
    setPropertyType('semua');
    setPriceFilter('semua');
    setBedrooms(0);
    setShowFilters(false);
    setShowFavorites(false);
    setActiveNavigation('properties');
  };

  const navigationClass = (item: typeof activeNavigation) => (
    `flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-center text-xs font-bold transition-colors ${
      activeNavigation === item
        ? 'bg-[#142544] text-white shadow-sm'
        : 'bg-[#F8F7F3] text-[#142544] hover:bg-[#B49453]/15'
    }`
  );

  return (
    <div className="public-app-shell min-h-screen bg-[#F8F7F3] text-[#142544]">
      <header className="sticky top-0 z-30 border-b border-[#E8E5DD] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2.5">
          <a href="#home" aria-label="Sentra Property Jember" className="flex items-center">
            <img src="/sentra-property-brand.png" alt="Sentra Property Jember" className="h-14 w-auto object-contain" />
          </a>
          <div className="min-w-0 flex-1 border-l border-[#E8E5DD] pl-3">
            <p className="truncate text-[11px] font-bold tracking-wide text-[#142544]">Properti Pilihan Jember</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6B7280]">
              <MapPin className="h-3 w-3 shrink-0 text-[#B49453]" />
              <span className="truncate">Jember · Jawa Timur</span>
            </p>
          </div>
          <div className="shrink-0">
            <PWAInstallButton />
          </div>
        </div>
      </header>

      <main>
        <section
          id="home"
          className="relative overflow-hidden border-b-[3px] border-[#D8C596] bg-gradient-to-br from-[#142544] via-[#10203C] to-[#0B1730] px-4 py-5 text-white sm:py-7"
        >
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full border border-[#B49453]/20 sm:-right-4 sm:-top-24 sm:h-64 sm:w-64" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-1 -top-8 h-32 w-32 rounded-full border border-[#B49453]/15 sm:right-8 sm:-top-12 sm:h-48 sm:w-48" />
          <div className="mx-auto max-w-3xl">
            <h1 className="text-xl leading-tight sm:text-2xl" style={{ color: '#FFFFFF', fontWeight: 700, letterSpacing: 'normal' }}>
              Sentra Property
            </h1>
            <span aria-hidden="true" className="mt-2 block h-[3px] w-12 rounded-full bg-[#D8C596]" />
            <p className="mt-1.5 text-xs font-medium tracking-wide text-white/75 sm:text-sm">
              Rumah <span className="px-1.5 text-[#D8C596]">·</span> Tanah <span className="px-1.5 text-[#D8C596]">·</span> Ruko <span className="px-1.5 text-[#D8C596]">·</span> Sewa di Jember
            </p>
          </div>
        </section>

        <nav aria-label="Navigasi aplikasi" className="sticky top-[76px] z-20 border-b border-[#E8E5DD] bg-white shadow-sm">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-2 px-4 py-2.5 sm:flex sm:items-center">
            <a
              href="#home"
              onClick={() => {
                setShowFavorites(false);
                setActiveNavigation('home');
              }}
              aria-current={activeNavigation === 'home' ? 'page' : undefined}
              className={`${navigationClass('home')} sm:shrink-0`}
            >
              Beranda
            </a>
            <a
              href="#properties"
              onClick={() => {
                setShowFavorites(false);
                setActiveNavigation('properties');
              }}
              aria-current={activeNavigation === 'properties' ? 'page' : undefined}
              className={`${navigationClass('properties')} sm:shrink-0`}
            >
              Cari properti
            </a>
            <button
              type="button"
              onClick={() => {
                setShowFavorites(true);
                setActiveNavigation('favorites');
              }}
              aria-pressed={showFavorites}
              className={navigationClass('favorites')}
            >
              Favorit ({visibleFavoriteCount})
            </button>
            <a
              href={BUSINESS_CONFIG.whatsapp.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setActiveNavigation('contact')}
              aria-current={activeNavigation === 'contact' ? 'page' : undefined}
              className={navigationClass('contact')}
            >
              <MessageCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Hubungi kami</span>
            </a>
          </div>
        </nav>

        <section id="properties" className="mx-auto max-w-3xl scroll-mt-32 px-4 py-7 sm:py-9">
          {isSampleData && (
            <p role="status" className="mb-5 rounded-xl border border-[#E8D8A8] bg-[#FFF9E9] px-3 py-2.5 text-xs leading-relaxed text-[#6B5A31]">
              Ini data contoh untuk pratinjau. Ganti dengan listing terverifikasi sebelum aplikasi dipublikasikan.
            </p>
          )}
          <div className="mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B49453]">{showFavorites ? 'Tersimpan di perangkat' : 'Katalog properti'}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
                <h2 className="text-lg font-bold sm:text-xl" style={{ fontWeight: 650 }}>{showFavorites ? 'Properti favorit' : 'Temukan pilihan Anda'}</h2>
              {!isLoading && !loadError && (
                <span className="shrink-0 text-xs text-[#6B7280]">{visibleProperties.length} listing</span>
              )}
            </div>
          </div>

          <label className="flex h-12 items-center gap-2 rounded-xl border border-[#E8E5DD] bg-white px-3 shadow-sm focus-within:border-[#B49453]">
            <Search className="h-4 w-4 shrink-0 text-[#B49453]" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, lokasi, atau kata kunci"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#9CA3AF]"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Hapus pencarian">
                <X className="h-4 w-4 text-[#6B7280]" />
              </button>
            )}
          </label>

          <div className="mt-3 flex items-center gap-2">
            <div className="grid flex-1 grid-cols-3 rounded-xl border border-[#E8E5DD] bg-white p-1" aria-label="Filter transaksi">
              {([
                ['semua', 'Semua'],
                ['jual', 'Dijual'],
                ['sewa', 'Disewa'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={listingType === value}
                  onClick={() => setListingType(value)}
                  className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                    listingType === value ? 'bg-[#142544] text-white' : 'text-[#6B7280] hover:bg-[#F8F7F3]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-expanded={showFilters}
              aria-controls="public-app-filter-panel"
              onClick={() => setShowFilters((current) => !current)}
              className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-semibold ${
                showFilters || activeFilterCount > 0
                  ? 'border-[#B49453] bg-[#FFF9E9] text-[#142544]'
                  : 'border-[#E8E5DD] bg-white text-[#142544]'
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}
            </button>
          </div>

          {showFilters && (
            <div id="public-app-filter-panel" className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-[#E8E5DD] bg-white p-3 sm:grid-cols-3">
              <label className="block text-xs font-medium text-[#6B7280]">
                Tipe properti
                <select
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value as PropertyTypeFilter)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#E8E5DD] bg-white px-3 text-sm text-[#142544] outline-none focus:border-[#B49453]"
                >
                  <option value="semua">Semua tipe</option>
                  <option value="rumah">Rumah</option>
                  <option value="tanah">Tanah</option>
                  <option value="ruko">Ruko</option>
                  <option value="apartemen">Apartemen</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-[#6B7280]">
                Rentang harga
                <select
                  value={priceFilter}
                  onChange={(event) => setPriceFilter(event.target.value as PriceFilter)}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#E8E5DD] bg-white px-3 text-sm text-[#142544] outline-none focus:border-[#B49453]"
                >
                  {priceFilters.map((filter) => (
                    <option key={filter.value} value={filter.value}>{filter.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-medium text-[#6B7280]">
                Kamar tidur
                <select
                  value={bedrooms}
                  onChange={(event) => setBedrooms(Number(event.target.value))}
                  className="mt-1.5 h-10 w-full rounded-lg border border-[#E8E5DD] bg-white px-3 text-sm text-[#142544] outline-none focus:border-[#B49453]"
                >
                  <option value={0}>Semua jumlah</option>
                  <option value={1}>1+ kamar</option>
                  <option value={2}>2+ kamar</option>
                  <option value={3}>3+ kamar</option>
                </select>
              </label>
            </div>
          )}

          <div className="mt-6">
            {loadError ? (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {loadError}
              </div>
            ) : isLoading ? (
              <div role="status" className="rounded-xl border border-[#E8E5DD] bg-white p-8 text-center text-sm text-[#6B7280]">
                Memuat listing properti...
              </div>
            ) : visibleProperties.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleProperties.map((property) => (
                  <MobilePropertyCard
                    key={property.id}
                    property={property}
                    detailPath={`${basePath}/detail/${property.slug}`}
                    isFavorite={favoriteIds.includes(property.id)}
                    isSample={isSampleData}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E8E5DD] bg-white px-5 py-10 text-center">
                <Building className="mx-auto h-9 w-9 text-[#B49453]" />
                <h3 className="mt-3 font-bold" style={{ fontWeight: 700 }}>Belum ada listing yang cocok</h3>
                <p className="mt-1 text-sm text-[#6B7280]">Ubah filter atau mulai pencarian baru.</p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 rounded-lg bg-[#142544] px-4 py-2.5 text-xs font-bold text-white"
                >
                  Reset filter
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E8E5DD] bg-white px-4 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-2 text-xs text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Sentra Property · Jember</span>
          <a
            href={BUSINESS_CONFIG.whatsapp.link}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-[#142544]"
          >
            WhatsApp {BUSINESS_CONFIG.whatsapp.display}
          </a>
        </div>
      </footer>
    </div>
  );
};
