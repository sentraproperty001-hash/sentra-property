import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle, ExternalLink, HelpCircle } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'hero' | 'footer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'nav',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);
  const isPortalHost = window.location.hostname === 'app.sentraproperty.com';
  const isInstallRequested = new URLSearchParams(window.location.search).get('install') === '1';

  if (!isPortalHost) {
    return (
      <a
        href="https://app.sentraproperty.com/?install=1"
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 border border-[#B49453] bg-[#B49453] text-[#0B1730] shadow-sm hover:bg-[#D8C596] hover:shadow-md ${className}`}
        title="Buka portal Sentra Property untuk memasangnya"
      >
        <Download className="w-3.5 h-3.5 text-current" />
        <span>Pasang Aplikasi</span>
        <ExternalLink className="w-3 h-3 text-current" />
      </a>
    );
  }

  // If already installed, hide button or show installed status
  if (isInstalled) {
    return (
      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-[#B49453] bg-[#B49453]/10 px-3 py-1.5 rounded-lg border border-[#B49453]/30">
        <CheckCircle className="w-3.5 h-3.5" />
        <span>Aplikasi Terpasang</span>
      </span>
    );
  }

  const handleAction = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  // Base styling for nav variant
  const buttonContent = (
    <>
      <button
        onClick={handleAction}
        type="button"
        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 border shadow-sm ${
          isInstallable
            ? 'bg-[#B49453] text-[#0B1730] border-[#B49453] hover:bg-[#D8C596] hover:shadow-md'
            : 'bg-white text-[#142544] border-[#E8E5DD] hover:border-[#B49453] hover:text-[#B49453]'
        } ${className}`}
        title="Pasang Sentra Property di perangkat Anda"
      >
        <Download className="w-3.5 h-3.5 text-current" />
        <span>{isInstallRequested ? 'Lanjutkan Instalasi' : 'Instal Aplikasi'}</span>
      </button>

      {/* Installation Guide Modal for non-supported or manual browser installs */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E8E5DD] p-6 shadow-2xl relative text-[#142544]">
            {/* Close button */}
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[#6B7280] hover:text-[#142544] hover:bg-[#F8F7F3] transition"
              aria-label="Tutup panduan"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#142544] text-[#B49453] flex items-center justify-center border border-[#B49453]/30 shadow-sm">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-[#142544] leading-tight">
                  Instal Sentra Property
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Akses instan seperti aplikasi native di HP atau Laptop Anda
                </p>
              </div>
            </div>

            {/* Platform Guides */}
            <div className="space-y-4 my-5 text-sm">
              {isIOS ? (
                <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#E8E5DD]">
                  <p className="font-semibold text-xs uppercase tracking-wider text-[#B49453] mb-2">
                    Panduan Apple iOS (Safari)
                  </p>
                  <ol className="space-y-2 text-xs text-[#142544] list-decimal list-inside leading-relaxed">
                    <li>
                      Ketuk ikon <strong>Bagikan (Share)</strong> di bar bawah Safari (ikon kotak bertanda panah ke atas).
                    </li>
                    <li>
                      Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.
                    </li>
                    <li>
                      Ketuk <strong>Tambah (Add)</strong> di sudut kanan atas. Ikon Sentra Property akan muncul di layar utama Anda.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F8F7F3] border border-[#E8E5DD]">
                  <p className="font-semibold text-xs uppercase tracking-wider text-[#B49453] mb-2">
                    Panduan Google Chrome / Edge / Android
                  </p>
                  <ol className="space-y-2 text-xs text-[#142544] list-decimal list-inside leading-relaxed">
                    <li>
                      Klik menu <strong>tiga titik (⋮)</strong> di sudut kanan atas browser.
                    </li>
                    <li>
                      Pilih opsi <strong>"Instal Sentra Property..."</strong> atau <strong>"Pasang Aplikasi"</strong>.
                    </li>
                    <li>
                      Konfirmasi dengan mengklik tombol <strong>Instal</strong>.
                    </li>
                  </ol>
                </div>
              )}

              {/* Informative note about AI Studio Preview environment */}
              <div className="p-3.5 rounded-lg bg-[#142544]/5 border border-[#142544]/10 text-xs text-[#6B7280] flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 text-[#B49453] flex-shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-[#142544] block mb-0.5">Catatan Preview:</strong>
                  Pada jendela iframe preview, browser menonaktifkan dialog otomatis. Pada website publik HTTPS yang dideploy (Cloudflare Pages), dialog instalasi 1-klik akan langsung aktif.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white font-semibold text-xs tracking-wide transition shadow"
            >
              Saya Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );

  return buttonContent;
};
