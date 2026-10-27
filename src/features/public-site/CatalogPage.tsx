import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Layout } from '@/src/components/layout/Layout';
import { PropertyCard } from '@/src/components/ui/PropertyCard';
import { propertyRepository, SearchFilterParams } from '@/src/repositories/propertyRepository';
import { Property } from '@/src/types';
import {
  Search,
  Filter,
  RotateCcw,
  SlidersHorizontal,
  Home,
  Tag,
  DollarSign,
  Bed,
  ArrowUpDown,
  Building,
} from 'lucide-react';

const parsePriceParam = (value: string | null): number | undefined => {
  if (value === null || value.trim() === '') return undefined;

  const price = Number(value);
  return Number.isFinite(price) && price >= 0 ? price : undefined;
};

const parseSortParam = (value: string | null): 'newest' | 'asc' | 'desc' => {
  return value === 'asc' || value === 'desc' ? value : 'newest';
};

const getPriceRange = (searchParams: URLSearchParams): string => {
  const minPrice = parsePriceParam(searchParams.get('minPrice'));
  const maxPrice = parsePriceParam(searchParams.get('maxPrice'));

  if (minPrice === undefined && maxPrice === 500000000) return 'under-500m';
  if (minPrice === 500000000 && maxPrice === 1000000000) return '500m-1b';
  if (minPrice === 1000000000 && maxPrice === undefined) return 'above-1b';

  const priceRange = searchParams.get('priceRange');
  return priceRange === 'under-500m' || priceRange === '500m-1b' || priceRange === 'above-1b'
    ? priceRange
    : 'semua';
};

export const CatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial values from URL query parameters
  const [query, setQuery] = useState(searchParams.get('query') || '');
  const [listingType, setListingType] = useState(searchParams.get('listingType') || 'semua');
  const [propertyType, setPropertyType] = useState(searchParams.get('propertyType') || 'semua');
  const [priceRange, setPriceRange] = useState(() => getPriceRange(searchParams));
  const [minPrice, setMinPrice] = useState(() => parsePriceParam(searchParams.get('minPrice')));
  const [maxPrice, setMaxPrice] = useState(() => parsePriceParam(searchParams.get('maxPrice')));
  const [bedrooms, setBedrooms] = useState<number>(Number(searchParams.get('bedrooms')) || 0);
  const [sort, setSort] = useState<'newest' | 'asc' | 'desc'>(() => parseSortParam(searchParams.get('sort')));

  const [properties, setProperties] = useState<Property[]>([]);
  const [publishedProperties, setPublishedProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  useEffect(() => {
    let isActive = true;

    propertyRepository.findPublishedAsync()
      .then((results) => {
        if (isActive) setPublishedProperties(results);
      })
      .catch((error: unknown) => {
        if (isActive) {
          setPropertiesError(error instanceof Error ? error.message : 'Gagal memuat listing publik.');
        }
      })
      .finally(() => {
        if (isActive) setIsLoadingProperties(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    setQuery(searchParams.get('query') || '');
    setListingType(searchParams.get('listingType') || 'semua');
    setPropertyType(searchParams.get('propertyType') || 'semua');
    setPriceRange(getPriceRange(searchParams));
    setMinPrice(parsePriceParam(searchParams.get('minPrice')));
    setMaxPrice(parsePriceParam(searchParams.get('maxPrice')));
    const bedroomParam = Number(searchParams.get('bedrooms'));
    setBedrooms(Number.isFinite(bedroomParam) && bedroomParam > 0 ? bedroomParam : 0);
    setSort(parseSortParam(searchParams.get('sort')));
  }, [searchParams]);

  // Synchronize filter execution
  useEffect(() => {
    let filterMinPrice = minPrice;
    let filterMaxPrice = maxPrice;

    if (filterMinPrice === undefined && filterMaxPrice === undefined) {
      if (priceRange === 'under-500m') {
        filterMaxPrice = 500000000;
      } else if (priceRange === '500m-1b') {
        filterMinPrice = 500000000;
        filterMaxPrice = 1000000000;
      } else if (priceRange === 'above-1b') {
        filterMinPrice = 1000000000;
      }
    }

    const filterArgs: SearchFilterParams = {
      query: query.trim() || undefined,
      listingType: listingType !== 'semua' ? listingType : undefined,
      propertyType: propertyType !== 'semua' ? propertyType : undefined,
      minPrice: filterMinPrice,
      maxPrice: filterMaxPrice,
      bedrooms: bedrooms > 0 ? bedrooms : undefined,
      sort,
    };

    const results = propertyRepository.filterPublished(publishedProperties, filterArgs);
    setProperties(results);
  }, [publishedProperties, query, listingType, propertyType, priceRange, minPrice, maxPrice, bedrooms, sort]);

  const handleReset = () => {
    setQuery('');
    setListingType('semua');
    setPropertyType('semua');
    setPriceRange('semua');
    setMinPrice(undefined);
    setMaxPrice(undefined);
    setBedrooms(0);
    setSort('newest');
    setSearchParams({});
  };

  return (
    <Layout>
      <div className="bg-[#F8F7F3] min-h-screen py-8 sm:py-12">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Header Banner */}
          <div className="mb-8 pb-6 border-b border-[#E8E5DD] flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#B49453] uppercase tracking-widest block mb-1">
                Katalog Properti Sentra Property
              </span>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-[#142544] tracking-tight">
                Pilihan Properti di Jember
              </h1>
              <p className="text-xs sm:text-sm text-[#6B7280] mt-1.5">
                {isLoadingProperties
                  ? 'Memuat listing publik...'
                  : propertiesError
                    ? 'Listing publik tidak dapat dimuat.'
                    : `Menampilkan ${properties.length} listing publik yang sesuai dengan kriteria pencarian Anda.`}
              </p>
            </div>

            {/* Mobile Filter Toggle & Sort Header */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
                className="lg:hidden inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#E8E5DD] text-xs font-bold text-[#142544] shadow-sm"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#B49453]" />
                <span>Filter ({listingType !== 'semua' || propertyType !== 'semua' || priceRange !== 'semua' || minPrice !== undefined || maxPrice !== undefined || query ? 'Aktif' : '0'})</span>
              </button>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#E8E5DD] shadow-sm text-xs text-[#142544]">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#B49453]" />
                <span className="text-[#6B7280] hidden sm:inline">Urutkan:</span>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as any)}
                  className="bg-transparent font-bold text-xs text-[#142544] focus:outline-none cursor-pointer"
                >
                  <option value="newest">Listing Terbaru</option>
                  <option value="asc">Harga Terendah</option>
                  <option value="desc">Harga Tertinggi</option>
                </select>
              </div>
            </div>
          </div>

          {/* Main Grid: Sidebar Filters + Property Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
            {/* Filter Sidebar (Desktop & Mobile Drawer) */}
            <aside
              className={`lg:col-span-1 bg-white p-6 rounded-2xl border border-[#E8E5DD] shadow-sm space-y-6 ${
                filterDrawerOpen ? 'block' : 'hidden lg:block'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DD]">
                <h2 className="text-sm font-extrabold uppercase tracking-wider text-[#142544] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#B49453]" />
                  <span>Filter Properti</span>
                </h2>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-[11px] font-semibold text-[#6B7280] hover:text-[#B49453] flex items-center gap-1 transition"
                  title="Reset semua filter"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              {/* 1. Keyword search */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#142544] block">Kata Kunci / Lokasi</label>
                <div className="relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Contoh: Kaliwates, Patrang..."
                    className="w-full h-10 pl-9 pr-3 text-xs bg-[#F8F7F3] border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49453] focus:border-transparent text-[#142544]"
                  />
                  <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-3" />
                </div>
              </div>

              {/* 2. Jenis Transaksi */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#142544] block">Jenis Transaksi</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#F8F7F3] rounded-xl border border-[#E8E5DD]">
                  <button
                    type="button"
                    onClick={() => setListingType('semua')}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition ${
                      listingType === 'semua'
                        ? 'bg-[#142544] text-white shadow-xs'
                        : 'text-[#6B7280] hover:text-[#142544]'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingType('jual')}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition ${
                      listingType === 'jual'
                        ? 'bg-[#142544] text-white shadow-xs'
                        : 'text-[#6B7280] hover:text-[#142544]'
                    }`}
                  >
                    Dijual
                  </button>
                  <button
                    type="button"
                    onClick={() => setListingType('sewa')}
                    className={`py-1.5 rounded-lg text-[11px] font-bold transition ${
                      listingType === 'sewa'
                        ? 'bg-[#142544] text-white shadow-xs'
                        : 'text-[#6B7280] hover:text-[#142544]'
                    }`}
                  >
                    Disewa
                  </button>
                </div>
              </div>

              {/* 3. Tipe Properti */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#142544] block">Tipe Properti</label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-[#F8F7F3] border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49453] text-[#142544]"
                >
                  <option value="semua">Semua Tipe Properti</option>
                  <option value="rumah">Rumah Tinggal</option>
                  <option value="ruko">Ruko & Komersial</option>
                  <option value="tanah">Tanah Kavling</option>
                  <option value="apartemen">Apartemen & Studio</option>
                </select>
              </div>

              {/* 4. Rentang Harga */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#142544] block">Rentang Harga</label>
                <select
                  value={priceRange}
                  onChange={(e) => {
                    setPriceRange(e.target.value);
                    setMinPrice(undefined);
                    setMaxPrice(undefined);
                  }}
                  className="w-full h-10 px-3 text-xs bg-[#F8F7F3] border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49453] text-[#142544]"
                >
                  <option value="semua">Semua Rentang Harga</option>
                  <option value="under-500m">&lt; Rp 500 Juta</option>
                  <option value="500m-1b">Rp 500 Jt - Rp 1 Milyar</option>
                  <option value="above-1b">&gt; Rp 1 Milyar</option>
                </select>
              </div>

              {/* 5. Minimal Kamar Tidur */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#142544] block">Kamar Tidur Minimum</label>
                <div className="flex gap-1.5">
                  {[0, 1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBedrooms(num)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition ${
                        bedrooms === num
                          ? 'bg-[#142544] text-[#D8C596] border-[#142544]'
                          : 'bg-[#F8F7F3] text-[#142544] border-[#E8E5DD] hover:border-[#B49453]'
                      }`}
                    >
                      {num === 0 ? 'Semua' : `${num}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reset Action */}
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl border border-[#B49453] text-[#B49453] hover:bg-[#B49453] hover:text-[#0B1730] font-bold text-xs tracking-wide transition shadow-xs"
              >
                Reset Semua Filter
              </button>
            </aside>

            {/* Properties List / Grid */}
            <main className="lg:col-span-3">
              {propertiesError ? (
                <div role="alert" className="p-8 text-center bg-red-50 rounded-2xl border border-red-200 shadow-sm max-w-lg mx-auto text-sm text-red-800">
                  {propertiesError}
                </div>
              ) : isLoadingProperties ? (
                <div role="status" className="p-12 text-center bg-white rounded-2xl border border-[#E8E5DD] shadow-sm max-w-lg mx-auto text-sm text-[#6B7280]">
                  Memuat listing publik...
                </div>
              ) : properties.length === 0 ? (
                /* Empty state */
                <div className="p-12 text-center bg-white rounded-2xl border border-[#E8E5DD] shadow-sm max-w-lg mx-auto">
                  <div className="w-16 h-16 rounded-full bg-[#142544]/5 text-[#B49453] flex items-center justify-center mx-auto mb-4">
                    <Building className="w-8 h-8 opacity-75" />
                  </div>
                  <h3 className="text-lg font-bold text-[#142544] mb-2">
                    Tidak Ada Properti yang Sesuai
                  </h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed mb-6">
                    Kriteria pencarian Anda belum menemukan hasil yang cocok di database Sentra Property. Silakan ubah filter atau reset pencarian.
                  </p>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#B49453] hover:bg-[#D8C596] text-[#0B1730] font-bold text-xs uppercase tracking-wider transition shadow-sm"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset Kriteria Pencarian</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              )}
            </main>
          </div>
        </div>
      </div>
    </Layout>
  );
};
