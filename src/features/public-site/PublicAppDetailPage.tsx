import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Property } from '@/src/types';
import { BUSINESS_CONFIG } from '@/src/lib/constants';
import { readPublicAppFavorites, writePublicAppFavorites } from './publicAppFavorites';
import { loadPublicAppProperties } from './publicAppSampleProperties';
import { ArrowLeft, Bath, Bed, Building, Car, Heart, MapPin, Maximize2, Share2 } from 'lucide-react';

const formatRupiah = (price: number, isRent: boolean) => {
  const formatted = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(price);
  return isRent ? `${formatted} / tahun` : formatted;
};

export const PublicAppDetailPage: React.FC<{ basePath?: string }> = ({ basePath = '' }) => {
  const { slug } = useParams<{ slug: string }>();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isSampleData, setIsSampleData] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>(readPublicAppFavorites);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    let isActive = true;

    loadPublicAppProperties()
      .then(({ properties: loadedProperties, isSampleData: usingSampleData }) => {
        if (isActive) {
          setProperties(loadedProperties);
          setIsSampleData(usingSampleData);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setLoadError(error instanceof Error ? error.message : 'Gagal memuat detail properti.');
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
    setImageFailed(false);
    setShareMessage(null);
    setActiveImageIndex(0);
  }, [slug]);

  const property = properties.find((item) => item.slug === slug);
  const galleryImages = property?.images?.length
    ? property.images
    : property?.image ? [property.image] : [];

  const toggleFavorite = () => {
    if (!property) return;
    setFavoriteIds((current) => {
      const updated = current.includes(property.id)
        ? current.filter((id) => id !== property.id)
        : [...current, property.id];
      writePublicAppFavorites(updated);
      return updated;
    });
  };

  const shareProperty = async () => {
    if (!property || !navigator.share) {
      setShareMessage('Berbagi langsung tidak tersedia di browser ini.');
      return;
    }

    try {
      await navigator.share({
        title: property.title,
        text: `Lihat properti ini di Sentra Property: ${property.title}`,
        url: window.location.href,
      });
      setShareMessage(null);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.error('Unable to share property:', error);
      setShareMessage('Tautan properti gagal dibagikan. Silakan salin alamat halaman ini.');
    }
  };

  const appUrl = (path: string) => `${basePath}${path}`;

  if (isLoading) {
    return (
      <div role="status" className="public-app-shell min-h-screen bg-[#F8F7F3] px-4 py-20 text-center text-sm text-[#6B7280]">
        Memuat detail properti...
      </div>
    );
  }

  if (loadError) {
    return (
      <div role="alert" className="public-app-shell min-h-screen bg-[#F8F7F3] px-4 py-20 text-center text-sm text-red-800">
        {loadError}
      </div>
    );
  }

  if (!property) {
    return (
      <div className="public-app-shell min-h-screen bg-[#F8F7F3] px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-[#142544]" style={{ fontWeight: 700 }}>Properti tidak ditemukan</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Listing ini tidak tersedia di katalog publik.</p>
        <Link to={appUrl('/katalog')} className="mt-5 inline-flex rounded-xl bg-[#142544] px-4 py-3 text-sm font-bold text-white">
          Kembali ke properti
        </Link>
      </div>
    );
  }

  const isRent = property.listing_type === 'sewa';
  const isFavorite = favoriteIds.includes(property.id);
  const whatsappText = encodeURIComponent(
    `Halo Sentra Property, saya tertarik dengan ${property.title} (${formatRupiah(property.price, isRent)}). Mohon informasi lebih lanjut.`
  );

  return (
    <div className="public-app-shell min-h-screen bg-[#F8F7F3] pb-24 text-[#142544]">
      <header className="sticky top-0 z-30 border-b border-[#E8E5DD] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to={appUrl('/katalog')} className="inline-flex items-center gap-2 text-sm font-bold">
            <ArrowLeft className="h-4 w-4" />
            <span>Properti</span>
          </Link>
          <div className="flex items-center gap-3">
            <button type="button" onClick={shareProperty} aria-label="Bagikan properti" className="rounded-full p-2 text-[#142544] hover:bg-[#F8F7F3]">
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl">
        <section className="relative aspect-[4/3] max-h-[480px] overflow-hidden bg-[#142544] sm:aspect-[16/9]">
          {galleryImages[activeImageIndex] && !imageFailed ? (
            <img src={galleryImages[activeImageIndex]} alt={property.title} onError={() => setImageFailed(true)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-[#D8C596]">
              <Building className="h-14 w-14" />
              <span className="text-sm font-medium">Foto properti belum tersedia</span>
            </div>
          )}
          <span className="absolute left-4 top-4 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#142544] shadow">
            {isRent ? 'Disewakan' : 'Dijual'} · {property.property_type}
          </span>
          {isSampleData && (
            <span className="absolute left-4 top-14 rounded-lg bg-[#B49453] px-3 py-1.5 text-xs font-bold text-[#142544] shadow">
              DATA CONTOH
            </span>
          )}
          <button
            type="button"
            onClick={toggleFavorite}
            aria-label={isFavorite ? 'Hapus dari favorit' : 'Simpan ke favorit'}
            aria-pressed={isFavorite}
            className="absolute right-4 top-4 rounded-full bg-white p-2.5 text-[#B49453] shadow"
          >
            <Heart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </section>
        {galleryImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto px-4 py-3">
            {galleryImages.map((imageUrl, index) => (
              <button
                key={imageUrl}
                type="button"
                onClick={() => {
                  setActiveImageIndex(index);
                  setImageFailed(false);
                }}
                aria-label={`Lihat foto ${index + 1}`}
                aria-pressed={activeImageIndex === index}
                className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                  activeImageIndex === index ? 'border-[#B49453]' : 'border-transparent'
                }`}
              >
                <img src={imageUrl} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <section className="space-y-5 px-4 py-5">
          {isSampleData && (
            <p role="status" className="rounded-xl border border-[#E8D8A8] bg-[#FFF9E9] px-3 py-2.5 text-xs leading-relaxed text-[#6B5A31]">
              Data contoh untuk pratinjau. Informasi properti ini belum merupakan penawaran nyata.
            </p>
          )}
          <div>
            <p className="text-xl font-extrabold text-[#142544]">{formatRupiah(property.price, isRent)}</p>
            <h1 className="mt-1 text-lg font-bold leading-snug text-[#142544]" style={{ fontWeight: 700 }}>{property.title}</h1>
            <p className="mt-2 flex items-start gap-2 text-sm text-[#6B7280]">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B49453]" />
              <span>{property.address || `${property.district}, ${property.city}`}</span>
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 rounded-xl border border-[#E8E5DD] bg-white p-3 text-center">
            {[
              { icon: Bed, label: 'Kamar tidur', value: property.bedrooms },
              { icon: Bath, label: 'Kamar mandi', value: property.bathrooms },
              { icon: Maximize2, label: 'Luas tanah', value: property.land_area ? `${property.land_area} m²` : '—' },
              { icon: Car, label: 'Parkir', value: property.parking_spaces },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="min-w-0">
                <Icon className="mx-auto h-4 w-4 text-[#B49453]" />
                <p className="mt-1 truncate text-xs font-bold">{value || '—'}</p>
                <p className="mt-0.5 text-[9px] leading-tight text-[#6B7280]">{label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-[#E8E5DD] bg-white p-4">
            <h2 className="text-sm font-bold" style={{ fontWeight: 700 }}>Tentang properti</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[#6B7280]">
              {property.description || 'Informasi detail properti belum tersedia.'}
            </p>
          </div>

          {shareMessage && <p role="status" className="text-xs text-[#6B7280]">{shareMessage}</p>}
        </section>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8E5DD] bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <a
          href={`${BUSINESS_CONFIG.whatsapp.link}?text=${whatsappText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto flex max-w-3xl items-center justify-center rounded-xl bg-[#142544] px-4 py-3.5 text-sm font-bold text-white"
        >
          Tanya via WhatsApp
        </a>
      </div>
    </div>
  );
};
