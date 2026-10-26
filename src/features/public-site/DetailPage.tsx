import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/src/components/layout/Layout';
import { PropertyCard } from '@/src/components/ui/PropertyCard';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { Property } from '@/src/types';
import { leadRepository } from '@/src/repositories/leadRepository';
import { PROFILES } from '@/src/data/demo-data';
import { BUSINESS_CONFIG } from '../../lib/constants';
import {
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Building,
  Car,
  Layers,
  ArrowLeft,
  Share2,
  ShieldCheck,
  MessageCircle,
  Phone,
  User,
  CheckCircle,
  Send,
  AlertCircle,
  FileCheck,
} from 'lucide-react';

export const DetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [publishedProperties, setPublishedProperties] = useState<Property[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);

  // Contact Lead Form State
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [leadMessage, setLeadMessage] = useState('');
  const [submittedLead, setSubmittedLead] = useState(false);
  const [leadSubmitError, setLeadSubmitError] = useState<string | null>(null);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    let isActive = true;
    setIsLoadingProperties(true);
    setPropertiesError(null);

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

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [slug]);

  const property = publishedProperties.find((item) => item.slug === slug);

  if (isLoadingProperties) {
    return (
      <Layout>
        <div role="status" className="container mx-auto px-4 py-20 text-center text-sm text-[#6B7280]">
          Memuat detail properti...
        </div>
      </Layout>
    );
  }

  if (propertiesError) {
    return (
      <Layout>
        <div role="alert" className="container mx-auto px-4 py-20 text-center max-w-md text-sm text-red-800">
          {propertiesError}
        </div>
      </Layout>
    );
  }

  if (!property) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-20 text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[#142544]/5 text-[#C9A34E] flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#142544] mb-2">Properti Tidak Ditemukan</h1>
          <p className="text-xs text-[#6B7280] mb-6">
            Properti dengan tautan ini tidak tersedia di katalog Sentra Property.
          </p>
          <Link
            to="/katalog"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#142544] text-white text-xs font-bold hover:bg-[#0B1730] transition shadow"
          >
            <ArrowLeft className="w-4 h-4 text-[#C9A34E]" />
            <span>Kembali ke Katalog Properti</span>
          </Link>
        </div>
      </Layout>
    );
  }

  // Find assigned agent
  const agent = PROFILES.find((p) => p.id === property.owner_agent_id) || {
    id: 'agent-default',
    full_name: 'Sentra Property Advisory Team',
    phone: BUSINESS_CONFIG.whatsapp.display,
    role: 'internal_agent',
  };

  const isRent = property.listing_type === 'sewa';

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Storage-backed property images are not configured yet.
  const galleryImages = property.image ? [property.image] : [];

  // Similar properties
  const similarProperties = publishedProperties
    .filter((p) => p.id !== property.id && (p.property_type === property.property_type || p.listing_type === property.listing_type))
    .slice(0, 3);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = leadName.trim();
    const phone = leadPhone.trim();
    const message = leadMessage.trim() || `Tertarik pada ${property.title} melalui website publik.`;
    if (!fullName || !phone) {
      setLeadSubmitError('Nama dan nomor WhatsApp wajib diisi.');
      return;
    }
    if (fullName.length > 120 || phone.length > 32 || message.length > 2000) {
      setLeadSubmitError('Periksa kembali panjang nama, nomor telepon, atau pesan Anda.');
      return;
    }

    setLeadSubmitError(null);
    setIsSubmittingLead(true);
    try {
      await leadRepository.submitPublicInterest({
        property_id: property.id,
        assigned_agent_id: property.owner_agent_id,
        full_name: fullName,
        phone,
        message,
      });
      setSubmittedLead(true);
      setLeadName('');
      setLeadPhone('');
      setLeadMessage('');
    } catch (error) {
      setLeadSubmitError(error instanceof Error ? error.message : 'Pesan minat gagal dikirim.');
    } finally {
      setIsSubmittingLead(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `Halo Sentra Property, saya tertarik dengan listing: "${property.title}" (Harga: ${formatRupiah(property.price)}) yang beralamat di ${property.address}. Mohon informasi ketersediaan unit dan jadwal survei.`
  );

  return (
    <Layout>
      <div className="bg-[#F8F7F3] min-h-screen py-8">
        <div className="container mx-auto px-4 sm:px-6">
          {/* Breadcrumb & Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <Link to="/" className="hover:text-[#C9A34E] transition">Beranda</Link>
              <span>/</span>
              <Link to="/katalog" className="hover:text-[#C9A34E] transition">Katalog</Link>
              <span>/</span>
              <span className="text-[#142544] font-medium truncate max-w-[200px] sm:max-w-xs">
                {property.title}
              </span>
            </div>

            <Link
              to="/katalog"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#142544] hover:text-[#C9A34E] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#C9A34E]" />
              <span>Kembali ke Katalog</span>
            </Link>
          </div>

          {/* Main Grid: Gallery + Info (Left 7 cols) & Sticky Contact (Right 5 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-16">
            {/* Left Content (8 Cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Photo Gallery Card */}
              <div className="bg-white rounded-2xl border border-[#E8E5DD] p-4 shadow-sm overflow-hidden">
                {/* Main Large Image */}
                <div className="relative aspect-[16/10] rounded-xl overflow-hidden bg-[#142544]/5 mb-3">
                  {galleryImages.length > 0 ? (
                    <img
                      src={galleryImages[selectedImageIndex]}
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[#6B7280]">
                      <Building className="w-12 h-12 text-[#C9A34E] mb-2" />
                      <span className="text-sm">Foto properti belum tersedia</span>
                    </div>
                  )}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-md shadow-sm ${
                        isRent
                          ? 'bg-[#C9A34E] text-[#0B1730]'
                          : 'bg-[#142544] text-white border border-[#C9A34E]/40'
                      }`}
                    >
                      {isRent ? 'Disewakan' : 'Dijual'}
                    </span>
                    <span className="text-xs font-semibold capitalize px-3 py-1 rounded-md bg-white/95 text-[#142544] shadow-sm">
                      {property.property_type}
                    </span>
                  </div>
                </div>

                {/* Thumbnails */}
                {galleryImages.length > 1 && <div className="grid grid-cols-3 gap-3">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative aspect-[16/10] rounded-lg overflow-hidden border-2 transition ${
                        selectedImageIndex === idx
                          ? 'border-[#C9A34E] ring-2 ring-[#C9A34E]/30'
                          : 'border-[#E8E5DD] opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`Perspektif ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>}
              </div>

              {/* Title & Price Header */}
              <div className="bg-white rounded-2xl border border-[#E8E5DD] p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#E8E5DD]">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#142544] tracking-tight mb-2">
                      {property.title}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#6B7280] flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#C9A34E] flex-shrink-0" />
                      <span>{property.address}, {property.district}, Jember, Jawa Timur</span>
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <span className="text-xs text-[#6B7280] font-medium uppercase tracking-wider block">
                      Harga Penawaran
                    </span>
                    <span className="text-2xl sm:text-3xl font-black text-[#142544] tracking-tight">
                      {formatRupiah(property.price)}
                      {isRent && <span className="text-sm font-normal text-[#6B7280]"> / tahun</span>}
                    </span>
                  </div>
                </div>

                {/* Specifications Grid */}
                <div className="py-6 border-b border-[#E8E5DD]">
                  <h2 className="text-xs font-bold text-[#C9A34E] uppercase tracking-widest mb-4">
                    Spesifikasi Utama Properti
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-[#F8F7F3] rounded-xl border border-[#E8E5DD]">
                      <Maximize2 className="w-5 h-5 text-[#C9A34E]" />
                      <div>
                        <span className="text-[10px] text-[#6B7280] block">Luas Tanah</span>
                        <span className="text-sm font-bold text-[#142544]">{property.land_area ? `${property.land_area} m²` : '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#F8F7F3] rounded-xl border border-[#E8E5DD]">
                      <Building className="w-5 h-5 text-[#C9A34E]" />
                      <div>
                        <span className="text-[10px] text-[#6B7280] block">Luas Bangunan</span>
                        <span className="text-sm font-bold text-[#142544]">{property.building_area ? `${property.building_area} m²` : '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#F8F7F3] rounded-xl border border-[#E8E5DD]">
                      <Bed className="w-5 h-5 text-[#C9A34E]" />
                      <div>
                        <span className="text-[10px] text-[#6B7280] block">Kamar Tidur</span>
                        <span className="text-sm font-bold text-[#142544]">{property.bedrooms > 0 ? `${property.bedrooms} Kamar` : '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#F8F7F3] rounded-xl border border-[#E8E5DD]">
                      <Bath className="w-5 h-5 text-[#C9A34E]" />
                      <div>
                        <span className="text-[10px] text-[#6B7280] block">Kamar Mandi</span>
                        <span className="text-sm font-bold text-[#142544]">{property.bathrooms > 0 ? `${property.bathrooms} Ruang` : '-'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#F8F7F3] rounded-xl border border-[#E8E5DD]">
                      <Layers className="w-5 h-5 text-[#C9A34E]" />
                      <div>
                        <span className="text-[10px] text-[#6B7280] block">Jumlah Lantai</span>
                        <span className="text-sm font-bold text-[#142544]">{property.floors > 0 ? `${property.floors} Lantai` : '1 Lantai'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#F8F7F3] rounded-xl border border-[#E8E5DD]">
                      <Car className="w-5 h-5 text-[#C9A34E]" />
                      <div>
                        <span className="text-[10px] text-[#6B7280] block">Kapasitas Parkir</span>
                        <span className="text-sm font-bold text-[#142544]">{property.parking_spaces > 0 ? `${property.parking_spaces} Mobil` : '-'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="pt-6">
                  <h2 className="text-xs font-bold text-[#C9A34E] uppercase tracking-widest mb-3">
                    Deskripsi Lengkap
                  </h2>
                  <p className="text-sm text-[#142544] leading-relaxed whitespace-pre-line">
                    {property.description}
                  </p>

                  <div className="mt-6 p-4 rounded-xl bg-[#F8F7F3] border border-[#E8E5DD] flex items-start gap-3 text-xs text-[#6B7280]">
                    <ShieldCheck className="w-5 h-5 text-[#C9A34E] flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-[#142544] block mb-0.5">Jaminan Legalitas Sentra Property:</strong>
                      Listing ini telah melewati verifikasi status kepemilikan dan kelengkapan dokumen pendukung untuk transaksi aman di hadapan Notaris / PPAT Kabupaten Jember.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sticky Contact Sidebar (4 Cols) */}
            <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
              {/* Agent Card */}
              <div className="bg-white rounded-2xl border border-[#E8E5DD] p-6 shadow-sm text-[#142544]">
                <span className="text-[10px] font-bold text-[#C9A34E] uppercase tracking-widest block mb-4">
                  Agen Resmi Sentra Property
                </span>

                <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[#E8E5DD]">
                  <div className="w-14 h-14 rounded-full bg-[#142544] text-[#C9A34E] flex items-center justify-center font-bold text-lg border-2 border-[#C9A34E] shadow-sm">
                    <User className="w-7 h-7 text-[#E0C477]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#142544]">{agent.full_name}</h3>
                    <p className="text-xs text-[#C9A34E] font-medium capitalize">
                      {agent.role === 'super_admin' || agent.role === 'admin'
                        ? 'Senior Property Advisor'
                        : agent.role === 'internal_agent'
                        ? 'Internal Agent Jember'
                        : 'Mitra Property Agent'}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {agent.phone}
                    </p>
                  </div>
                </div>

                {/* Primary WhatsApp Action Button */}
                <a
                  href={`${BUSINESS_CONFIG.whatsapp.link}?text=${whatsappMessage}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#C9A34E] hover:bg-[#E0C477] text-[#0B1730] font-extrabold text-xs tracking-wider uppercase text-center flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition mb-4"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Hubungi via WhatsApp</span>
                </a>

                {/* Direct Telephone */}
                <a
                  href={`tel:${agent.phone.replace(/[^0-9]/g, '')}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#F8F7F3] hover:bg-[#E8E5DD] text-[#142544] font-bold text-xs tracking-wide text-center flex items-center justify-center gap-2 transition"
                >
                  <Phone className="w-3.5 h-3.5 text-[#C9A34E]" />
                  <span>Telepon Langsung ({agent.phone})</span>
                </a>
              </div>

              {/* Inquiry Lead Form */}
              <div className="bg-white rounded-2xl border border-[#E8E5DD] p-6 shadow-sm text-[#142544]">
                <h3 className="font-bold text-sm text-[#142544] mb-1">Kirim Minat Properti</h3>
                <p className="text-xs text-[#6B7280] mb-4">
                  Tinggalkan kontak Anda, konsultan kami akan menghubungi Anda dalam waktu 1x24 jam.
                </p>

                {submittedLead ? (
                  <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#C9A34E] text-center text-xs text-[#142544] animate-in fade-in">
                    <CheckCircle className="w-6 h-6 text-[#C9A34E] mx-auto mb-2" />
                    <strong className="block mb-1">Permintaan Anda Berhasil Dikirim!</strong>
                    <span>Agen kami akan segera menghubungi nomor telepon Anda.</span>
                    <button
                      type="button"
                      onClick={() => setSubmittedLead(false)}
                      className="mt-3 block w-full font-bold text-[#142544] underline underline-offset-2"
                    >
                      Kirim minat lain
                    </button>
                  </div>
                ) : (
                  <form onSubmit={(event) => void handleLeadSubmit(event)} className="space-y-3">
                    {leadSubmitError && (
                      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                        {leadSubmitError}
                      </div>
                    )}
                    <div>
                      <label className="text-[11px] font-bold text-[#142544] block mb-1">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        placeholder="Nama Anda"
                        className="w-full h-10 px-3 text-xs bg-[#F8F7F3] border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A34E] text-[#142544]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#142544] block mb-1">
                        Nomor WhatsApp / HP <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        maxLength={32}
                        value={leadPhone}
                        onChange={(e) => setLeadPhone(e.target.value)}
                        placeholder="0812xxxxxxx"
                        className="w-full h-10 px-3 text-xs bg-[#F8F7F3] border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A34E] text-[#142544]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-[#142544] block mb-1">
                        Pesan atau Jadwal Survei
                      </label>
                      <textarea
                        rows={3}
                        maxLength={2000}
                        value={leadMessage}
                        onChange={(e) => setLeadMessage(e.target.value)}
                        placeholder="Contoh: Saya ingin survei hari Sabtu pagi..."
                        className="w-full p-3 text-xs bg-[#F8F7F3] border border-[#E8E5DD] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A34E] text-[#142544] resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingLead}
                      className="w-full py-2.5 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <Send className="w-3.5 h-3.5 text-[#C9A34E]" />
                      <span>{isSubmittingLead ? 'Mengirim...' : 'Kirim Pesan Minat'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Similar Properties Section */}
          {similarProperties.length > 0 && (
            <div className="pt-10 border-t border-[#E8E5DD]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <span className="text-xs font-bold text-[#C9A34E] uppercase tracking-widest block mb-1">
                    Pilihan Alternatif
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-[#142544]">
                    Properti Serupa di Jember
                  </h2>
                </div>
                <Link
                  to="/katalog"
                  className="text-xs font-bold text-[#142544] hover:text-[#C9A34E] transition"
                >
                  Lihat Semua
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                {similarProperties.map((p) => (
                  <PropertyCard key={p.id} property={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
