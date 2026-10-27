import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/src/components/layout/Layout';
import { PropertyCard } from '@/src/components/ui/PropertyCard';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { Property } from '@/src/types';
import { BUSINESS_CONFIG } from '../../lib/constants';
import {
  Search,
  MapPin,
  Home,
  Tag,
  Building,
  ShieldCheck,
  Award,
  Users,
  Compass,
  ArrowRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [publishedProperties, setPublishedProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  // Search state
  const [keyword, setKeyword] = useState('');
  const [listingType, setListingType] = useState('semua');
  const [propertyType, setPropertyType] = useState('semua');
  const [priceRange, setPriceRange] = useState('semua');

  useEffect(() => {
    let isActive = true;

    propertyRepository.findPublishedAsync()
      .then((properties) => {
        if (isActive) setPublishedProperties(properties);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set('query', keyword.trim());
    if (listingType !== 'semua') params.set('listingType', listingType);
    if (propertyType !== 'semua') params.set('propertyType', propertyType);

    if (priceRange === 'under-500m') {
      params.set('maxPrice', '500000000');
    } else if (priceRange === '500m-1b') {
      params.set('minPrice', '500000000');
      params.set('maxPrice', '1000000000');
    } else if (priceRange === 'above-1b') {
      params.set('minPrice', '1000000000');
    }

    navigate(`/katalog?${params.toString()}`);
  };

  const featuredProperties = publishedProperties.slice(0, 3);
  const latestProperties = publishedProperties.slice(3, 6).length > 0
    ? publishedProperties.slice(3, 6)
    : publishedProperties.slice(0, 3);
  const forSaleCount = publishedProperties.filter((property) => property.listing_type === 'jual').length;
  const forRentCount = publishedProperties.filter((property) => property.listing_type === 'sewa').length;
  const activeCategoryCount = new Set(publishedProperties.map((property) => property.property_type)).size;
  const publicStats: { value: number | string; label: string }[] = [
    { value: publishedProperties.length, label: 'Listing Aktif' },
    { value: forSaleCount, label: 'Properti Dijual' },
    { value: forRentCount, label: 'Properti Disewakan' },
    { value: activeCategoryCount, label: 'Kategori Tersedia' },
  ];

  const categories = [
    {
      title: 'Rumah Tinggal',
      count: publishedProperties.filter((p) => p.property_type === 'rumah').length,
      type: 'rumah',
      icon: Home,
      desc: 'Hunian cluster & residence keluarga',
    },
    {
      title: 'Ruko & Komersial',
      count: publishedProperties.filter((p) => p.property_type === 'ruko').length,
      type: 'ruko',
      icon: Building,
      desc: 'Lokasi usaha prima di pusat kota',
    },
    {
      title: 'Tanah Kavling',
      count: publishedProperties.filter((p) => p.property_type === 'tanah').length,
      type: 'tanah',
      icon: Compass,
      desc: 'Investasi tanah SHM siap bangun',
    },
    {
      title: 'Apartemen & Studio',
      count: publishedProperties.filter((p) => p.property_type === 'apartemen').length,
      type: 'apartemen',
      icon: Tag,
      desc: 'Sewa bulanan & tahunan strategis',
    },
  ];

  const advantages = [
    {
      icon: ShieldCheck,
      title: 'Pendampingan Informasi Legalitas',
      desc: 'Diskusikan kelengkapan dokumen dengan agen dan lakukan pemeriksaan bersama notaris atau PPAT sebelum transaksi.',
    },
    {
      icon: Award,
      title: 'Harga Transparan Tanpa Markup',
      desc: 'Harga langsung dari pemilik properti dengan estimasi appraisal wajar pasar Jember.',
    },
    {
      icon: Users,
      title: 'Didampingi Agen Lokal Ahli',
      desc: 'Konsultan properti berpengalaman mendampingi proses survei, negosiasi, hingga notaris.',
    },
    {
      icon: Compass,
      title: 'Jaringan Lokasi Terlengkap',
      desc: 'Pilihan properti terlengkap di Kaliwates, Sumbersari, Patrang, Mangli, hingga sekitarnya.',
    },
  ];

  const displayedCount = (count: number) => (
    isLoadingProperties ? '…' : propertiesError ? '—' : count
  );

  return (
    <Layout>
      {propertiesError && (
        <div role="alert" className="bg-red-50 border-b border-red-200 px-4 py-3 text-center text-sm text-red-800">
          {propertiesError}
        </div>
      )}
      {/* 1. HERO SECTION WITH UPLOADED BANNER BACKGROUND & PRESTIGIOUS LOGO PLACEMENT */}
      <section className="relative bg-[#0B1730] text-white overflow-hidden py-14 sm:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-b-4 border-[#B49453]">
        {/* Background Image: Authentic Website Banner Image with Pool & Luxury Villa */}
        <div className="absolute inset-0 z-0">
          <img
            src="/assets/aistudio/luxury_blue_house_hero.jpg"
            alt="Sentra Property Banner"
            className="w-full h-full object-cover object-center"
          />
          {/* Deep Navy Vignette Overlay to ensure perfect contrast while showcasing villa lights */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B1730]/80 via-[#0B1730]/60 to-[#0B1730]/95" />
          <div className="absolute inset-0 bg-[#0B1730]/25 backdrop-blur-[0.5px]" />
        </div>

        {/* Hero Content Container */}
        <div className="relative z-10 container mx-auto max-w-5xl text-center">

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-light tracking-tighter leading-tight mb-6">
            <span className="text-white">Temukan Properti yang Tepat untuk{' '}</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#B49453] via-[#D8C596] to-[#B49453]">
              Masa Depan Anda
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-[#E8E5DD] max-w-2xl mx-auto mb-12 font-light tracking-wide leading-relaxed">
            Portal properti terkurasi di Jember dengan legalitas terverifikasi, harga transparan, dan pendampingan agen profesional hingga serah terima kunci.
          </p>

          {/* SEARCH FORM (Visible, Structured, and Well-Bordered) */}
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(11,23,48,0.55)] border-2 border-[#B49453] text-[#142544] text-left max-w-4xl mx-auto backdrop-blur-md">
            {/* Transaction Type Tabs */}
            <div className="flex items-center gap-2 mb-4 border-b border-[#E8E5DD] pb-3">
              <button
                type="button"
                onClick={() => setListingType('semua')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  listingType === 'semua'
                    ? 'bg-[#142544] text-white shadow-sm'
                    : 'bg-[#F8F7F3] text-[#6B7280] hover:text-[#142544] hover:bg-[#E8E5DD]'
                }`}
              >
                Semua Transaksi
              </button>
              <button
                type="button"
                onClick={() => setListingType('jual')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  listingType === 'jual'
                    ? 'bg-[#142544] text-white shadow-sm'
                    : 'bg-[#F8F7F3] text-[#6B7280] hover:text-[#142544] hover:bg-[#E8E5DD]'
                }`}
              >
                Beli Properti
              </button>
              <button
                type="button"
                onClick={() => setListingType('sewa')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  listingType === 'sewa'
                    ? 'bg-[#142544] text-white shadow-sm'
                    : 'bg-[#F8F7F3] text-[#6B7280] hover:text-[#142544] hover:bg-[#E8E5DD]'
                }`}
              >
                Sewa Properti
              </button>
            </div>

            {/* Inputs Grid */}
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Keyword / Location */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#142544] uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#B49453]" /> Lokasi / Kata Kunci
                </label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Contoh: Kaliwates, Patrang..."
                  className="w-full h-11 px-3 text-xs bg-[#F8F7F3] text-[#142544] border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49453] focus:border-transparent transition"
                />
              </div>

              {/* Property Type */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#142544] uppercase tracking-wider flex items-center gap-1">
                  <Home className="w-3.5 h-3.5 text-[#B49453]" /> Tipe Properti
                </label>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className="w-full h-11 px-3 text-xs bg-[#F8F7F3] text-[#142544] border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49453] focus:border-transparent transition"
                >
                  <option value="semua">Semua Tipe</option>
                  <option value="rumah">Rumah Tinggal</option>
                  <option value="ruko">Ruko & Komersial</option>
                  <option value="tanah">Tanah Kavling</option>
                  <option value="apartemen">Apartemen / Studio</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[#142544] uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-[#B49453]" /> Rentang Harga
                </label>
                <select
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  className="w-full h-11 px-3 text-xs bg-[#F8F7F3] text-[#142544] border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#B49453] focus:border-transparent transition"
                >
                  <option value="semua">Semua Rentang Harga</option>
                  <option value="under-500m">&lt; Rp 500 Juta</option>
                  <option value="500m-1b">Rp 500 Juta - Rp 1 Milyar</option>
                  <option value="above-1b">&gt; Rp 1 Milyar</option>
                </select>
              </div>

              {/* Submit Button */}
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full h-11 px-6 rounded-xl bg-[#B49453] hover:bg-[#D8C596] text-[#0B1730] font-extrabold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  <Search className="w-4 h-4 text-[#0B1730]" />
                  <span>Cari Properti</span>
                </button>
              </div>
            </form>
          </div>

          {/* Quick Stats Cards under Hero */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center max-w-4xl mx-auto">
            {publicStats.map((stat) => (
              <div key={stat.label} className="p-3.5 rounded-xl bg-[#0B1730]/85 border border-[#B49453]/30 backdrop-blur-md shadow-sm">
                <span className="text-xl sm:text-2xl font-black text-[#D8C596] block">
                  {isLoadingProperties ? '…' : propertiesError ? '—' : stat.value}
                </span>
                <p className="text-[11px] text-[#E8E5DD] font-medium mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2. KATEGORI PROPERTI */}
      <section className="py-14 bg-white border-b border-[#E8E5DD]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
            <div>
              <span className="text-xs font-bold text-[#B49453] uppercase tracking-widest block mb-1">
                Katalog Pilihan
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#142544] tracking-tight">
                Jelajahi Berdasarkan Kategori
              </h2>
            </div>
            <Link
              to="/katalog"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#142544] hover:text-[#B49453] transition"
            >
              <span>Lihat Semua Properti</span>
              <ArrowRight className="w-4 h-4 text-[#B49453]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((cat) => {
              const IconComp = cat.icon;
              return (
                <Link
                  key={cat.type}
                  to={`/katalog?propertyType=${cat.type}`}
                  className="group p-5 rounded-2xl bg-[#F8F7F3] border border-[#E8E5DD] hover:border-[#B49453] hover:shadow-lg transition-all duration-300 flex items-start gap-4"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#142544] text-[#B49453] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[#142544] group-hover:text-[#B49453] transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-[#6B7280] mt-0.5 line-clamp-1">{cat.desc}</p>
                    <span className="inline-block mt-2 text-[11px] font-semibold text-[#142544] bg-white px-2 py-0.5 rounded border border-[#E8E5DD]">
                      {displayedCount(cat.count)} Listing Aktif
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. PROPERTI PILIHAN (FEATURED) */}
      <section className="py-16 bg-[#F8F7F3]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-[#B49453] uppercase tracking-widest block mb-1">
                Rekomendasi Spesial
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#142544] tracking-tight">
                Properti Unggulan di Jember
              </h2>
              <p className="text-xs text-[#6B7280] mt-1 max-w-xl">
                Pilihan unit properti dengan lokasi paling diminati, harga kompetitif, dan siap transaksi.
              </p>
            </div>
            <Link
              to="/katalog"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#142544] text-white text-xs font-bold hover:bg-[#0B1730] hover:border-[#B49453] border border-[#142544] transition shadow-sm"
            >
              <span>Jelajahi Katalog Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#B49453]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. KEUNGGULAN SENTRA PROPERTY */}
      <section className="py-16 bg-white border-y border-[#E8E5DD]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-[#B49453] uppercase tracking-widest block mb-2">
              Mengapa Sentra Property?
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#142544] tracking-tight">
              Standar Layanan Agensi Properti Profesional
            </h2>
            <p className="text-xs text-[#6B7280] mt-2 leading-relaxed">
              Kami menghubungkan pemilik, pembeli, dan penyewa properti di Jember dengan komitmen integritas, kecepatan, dan perlindungan hukum menyeluruh.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {advantages.map((adv, idx) => {
              const IconComp = adv.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl bg-[#F8F7F3] border border-[#E8E5DD] hover:border-[#B49453] hover:shadow-md transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-[#142544] text-[#B49453] flex items-center justify-center mb-4 shadow-sm">
                    <IconComp className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-[#142544] mb-2">{adv.title}</h3>
                  <p className="text-xs text-[#6B7280] leading-relaxed">{adv.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5. PROPERTI TERBARU */}
      <section className="py-16 bg-[#F8F7F3]">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
            <div>
              <span className="text-xs font-bold text-[#B49453] uppercase tracking-widest block mb-1">
                Listing Terkini
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#142544] tracking-tight">
                Properti Terbaru Ditambahkan
              </h2>
            </div>
            <Link
              to="/katalog?sort=newest"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#142544] hover:text-[#B49453] transition"
            >
              <span>Lihat Urutan Terbaru</span>
              <ArrowRight className="w-4 h-4 text-[#B49453]" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {latestProperties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION FOR OWNERS */}
      <section className="py-16 bg-[#142544] text-white relative overflow-hidden">
        {/* Subtle decorative gold line pattern */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#B49453] to-transparent opacity-80" />
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <span className="inline-block px-3 py-1 rounded-full bg-[#0B1730] text-[#D8C596] border border-[#B49453]/40 text-xs font-bold uppercase tracking-wider">
              Layanan Pemilik Properti
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Ingin Menjual atau Menyewakan Properti di Jember?
            </h2>
            <p className="text-sm text-[#E8E5DD]/90 leading-relaxed max-w-xl mx-auto">
              Percayakan aset berharga Anda kepada Sentra Property. Dapatkan publikasi masif, calon pembeli terverifikasi, dan pendampingan transaksi hingga selesai.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={`${BUSINESS_CONFIG.whatsapp.link}?text=Halo%20${BUSINESS_CONFIG.name},%20saya%20ingin%20menjual/menyewakan%20properti%20saya%20di%20Jember.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#B49453] hover:bg-[#D8C596] text-[#0B1730] font-extrabold text-xs tracking-wider uppercase transition shadow-lg hover:shadow-xl"
              >
                Konsultasi Titip Properti Gratis
              </a>
              <Link
                to="/katalog"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs tracking-wider uppercase transition border border-white/20"
              >
                Pelajari Pasar Jember
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};
