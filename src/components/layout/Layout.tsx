import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BrandLogo } from '../ui/BrandLogo';
import { PWAInstallButton } from '../PWAInstallButton';
import { BUSINESS_CONFIG } from '../../lib/constants';
import {
  Menu,
  X,
  Phone,
  Mail,
  MapPin,
  Clock,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Beranda', path: '/' },
    { label: 'Cari Properti', path: '/katalog' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F7F3] text-[#142544] selection:bg-[#C9A34E]/30 selection:text-[#0B1730]">
      {/* Top Notice Bar */}
      <div className="bg-[#0B1730] text-[#E0C477] text-[11px] font-medium tracking-wide py-1.5 px-4 border-b border-[#22375C]">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-[#C9A34E] animate-pulse" />
            <span>{BUSINESS_CONFIG.name} — Layanan Jual, Beli, & Sewa Properti Terpercaya</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[#F8F7F3]/80">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-[#C9A34E]" /> Jember
            </span>
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3 text-[#C9A34E]" /> {BUSINESS_CONFIG.whatsapp.display}
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-[#E8E5DD] sticky top-0 z-40 shadow-[0_2px_12px_rgba(20,37,68,0.04)] backdrop-blur-md bg-white/95">
        <div className="container mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center">
          {/* Logo */}
          <BrandLogo variant="light" size="md" />
          
          {/* ... (keep rest of Header as is for now) ... */}
          <nav className="hidden lg:flex items-center gap-8 text-sm font-semibold tracking-wide text-[#142544]">
            {navLinks.map((link) => {
              const active = isActive(link.path);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative py-1 transition-colors duration-200 hover:text-[#C9A34E] ${
                    active ? 'text-[#C9A34E]' : 'text-[#142544]'
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-[#C9A34E] rounded-full" />
                  )}
                </Link>
              );
            })}

            <button
              onClick={() => setShowSellModal(true)}
              className="py-1 transition-colors duration-200 hover:text-[#C9A34E] text-[#142544] font-semibold text-sm"
            >
              Jual / Sewakan
            </button>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            <PWAInstallButton />

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#142544] hover:bg-[#0B1730] text-white text-xs font-bold tracking-wide border border-[#142544] hover:border-[#C9A34E] transition shadow-sm"
            >
              <span>Masuk Portal</span>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <PWAInstallButton />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#142544] hover:bg-[#F8F7F3] transition"
              aria-label="Menu navigasi"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-[#E8E5DD] bg-white px-4 py-5 shadow-xl animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col gap-3 font-semibold text-sm text-[#142544]">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-lg transition ${
                    isActive(link.path)
                      ? 'bg-[#142544] text-[#E0C477]'
                      : 'hover:bg-[#F8F7F3] text-[#142544]'
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowSellModal(true);
                }}
                className="text-left p-2.5 rounded-lg hover:bg-[#F8F7F3] text-[#142544] font-semibold"
              >
                Jual / Sewakan Properti
              </button>

              <div className="pt-3 border-t border-[#E8E5DD] flex flex-col gap-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg bg-[#142544] text-white font-bold text-xs"
                >
                  Masuk Portal Agen / Admin
                </Link>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-grow">{children}</main>

      {/* Modal Jual / Sewakan Properti */}
      {showSellModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-[#E8E5DD] p-6 shadow-2xl relative text-[#142544]">
            <button
              onClick={() => setShowSellModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6B7280] hover:text-[#142544] hover:bg-[#F8F7F3] transition"
              aria-label="Tutup modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#142544] text-[#C9A34E] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#142544]">
                  Titipkan Properti Anda di {BUSINESS_CONFIG.name}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Jangkau ribuan calon pembeli & penyewa di Jember secara cepat dan aman
                </p>
              </div>
            </div>

            <div className="space-y-3 my-5 text-xs text-[#142544]">
              <div className="p-3.5 bg-[#F8F7F3] rounded-xl border border-[#E8E5DD]">
                <p className="font-semibold text-[#142544] mb-1">Keuntungan Bermitra:</p>
                <ul className="list-disc list-inside space-y-1 text-[#6B7280]">
                  <li>Foto & video properti profesional tanpa biaya di awal.</li>
                  <li>Promosi di portal digital & jaringan agen lokal Jember.</li>
                  <li>Bantuan negosiasi, appraisal harga wajar, & legalitas notaris.</li>
                </ul>
              </div>

              <p className="text-[#6B7280] leading-relaxed">
                Hubungi konsultan properti kami melalui WhatsApp untuk menjadwalkan survei lokasi dan konsultasi estimasi harga:
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={BUSINESS_CONFIG.whatsapp.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 px-4 rounded-xl bg-[#C9A34E] hover:bg-[#E0C477] text-[#0B1730] font-bold text-xs text-center flex items-center justify-center gap-2 shadow-md transition"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat WhatsApp Agen</span>
              </a>
              <button
                onClick={() => setShowSellModal(false)}
                className="py-3 px-4 rounded-xl bg-[#F8F7F3] hover:bg-[#E8E5DD] text-[#142544] font-semibold text-xs transition"
              >
                Nanti Saja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-[#0B1730] text-[#F8F7F3] border-t-2 border-[#C9A34E] pt-14 pb-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#22375C]">
            {/* Col 1: Brand & About */}
            <div className="space-y-4">
              <BrandLogo variant="dark" size="md" />
              <p className="text-xs text-[#E8E5DD]/75 leading-relaxed">
                {BUSINESS_CONFIG.name} adalah agensi properti terpercaya di Jember, Jawa Timur. Melayani jual, beli, dan sewa rumah, ruko, tanah kavling, serta properti komersial dengan legalitas aman dan transparan.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs text-[#C9A34E]">
                <ShieldCheck className="w-4 h-4 text-[#C9A34E]" />
                <span className="font-semibold">Legalitas & Sertifikasi Terverifikasi</span>
              </div>
            </div>

            {/* Col 2: Navigasi Cepat */}
            <div>
              <h4 className="text-sm font-bold tracking-wider uppercase text-[#E0C477] mb-4 pb-1 border-b border-[#22375C] inline-block">
                Navigasi Cepat
              </h4>
              <ul className="space-y-2.5 text-xs text-[#E8E5DD]/80">
                <li>
                  <Link to="/" className="hover:text-[#C9A34E] transition flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-[#C9A34E]" /> Beranda
                  </Link>
                </li>
                <li>
                  <Link to="/katalog?listingType=jual" className="hover:text-[#C9A34E] transition flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-[#C9A34E]" /> Properti Dijual
                  </Link>
                </li>
                <li>
                  <Link to="/katalog?listingType=sewa" className="hover:text-[#C9A34E] transition flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-[#C9A34E]" /> Properti Disewakan
                  </Link>
                </li>
                <li>
                  <button onClick={() => setShowSellModal(true)} className="hover:text-[#C9A34E] transition flex items-center gap-1.5 text-left">
                    <ChevronRight className="w-3 h-3 text-[#C9A34E]" /> Titip Jual / Sewa
                  </button>
                </li>
                <li>
                  <Link to="/dashboard" className="hover:text-[#C9A34E] transition flex items-center gap-1.5">
                    <ChevronRight className="w-3 h-3 text-[#C9A34E]" /> Portal Agen & Admin
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Wilayah Layanan Jember */}
            <div>
              <h4 className="text-sm font-bold tracking-wider uppercase text-[#E0C477] mb-4 pb-1 border-b border-[#22375C] inline-block">
                Wilayah Layanan
              </h4>
              <ul className="space-y-2 text-xs text-[#E8E5DD]/80">
                <li className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#C9A34E]" /> Kecamatan Kaliwates
                </li>
                <li className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#C9A34E]" /> Kecamatan Sumbersari
                </li>
                <li className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#C9A34E]" /> Kecamatan Patrang
                </li>
                <li className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#C9A34E]" /> Kawasan Kampus & Mangli
                </li>
                <li className="flex items-center gap-1.5">
                  <MapPin className="w-3 h-3 text-[#C9A34E]" /> Sukorambi & Sekitarnya
                </li>
              </ul>
            </div>

            {/* Col 4: Kontak & Kantor */}
            <div>
              <h4 className="text-sm font-bold tracking-wider uppercase text-[#E0C477] mb-4 pb-1 border-b border-[#22375C] inline-block">
                Kantor Pemasaran
              </h4>
              <ul className="space-y-3 text-xs text-[#E8E5DD]/80">
                <li className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#C9A34E] flex-shrink-0 mt-0.5" />
                  <span>{BUSINESS_CONFIG.address}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#C9A34E] flex-shrink-0" />
                  <span>{BUSINESS_CONFIG.whatsapp.display} (Customer Care)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#C9A34E] flex-shrink-0" />
                  <span>info@{BUSINESS_CONFIG.domain}</span>
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#C9A34E] flex-shrink-0" />
                  <span>Senin - Sabtu: 08.00 - 17.00 WIB</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#E8E5DD]/60">
            <p>
              &copy; {new Date().getFullYear()} <strong>{BUSINESS_CONFIG.name}</strong>. Hak Cipta Dilindungi Undang-Undang.
            </p>
            <p className="text-[11px] text-[#C9A34E]">
              Data properti yang ditampilkan bersifat demonstrasi resmi. Domain utama: {BUSINESS_CONFIG.domain}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};
