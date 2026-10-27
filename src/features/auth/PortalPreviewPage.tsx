import React from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/src/components/layout/Layout';
import { BrandLogo } from '@/src/components/ui/BrandLogo';
import { PROFILES } from '@/src/data/demo-data';
import {
  ShieldCheck,
  UserCheck,
  Building,
  KeyRound,
  ArrowRight,
  Info,
  CheckCircle,
} from 'lucide-react';

export const PortalPreviewPage: React.FC = () => {
  return (
    <Layout>
      <div className="bg-[#F8F7F3] min-h-[80vh] py-12">
        <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
          <div className="text-center mb-10">
            <span className="text-xs font-bold text-[#B49453] uppercase tracking-widest block mb-2">
              Sentra Property Internal
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#142544] tracking-tight">
              Portal Akses Agen & Manajemen
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] max-w-xl mx-auto mt-2 leading-relaxed">
              Area khusus staf internal, agen mitra, dan tim manajemen Sentra Property Jember untuk mengelola listing dan leads.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {PROFILES.map((profile) => (
              <div
                key={profile.id}
                className="bg-white p-6 rounded-2xl border border-[#E8E5DD] shadow-sm hover:border-[#B49453] hover:shadow-md transition text-[#142544]"
              >
                <div className="w-12 h-12 rounded-xl bg-[#142544] text-[#B49453] flex items-center justify-center mb-4">
                  {profile.role === 'super_admin' ? (
                    <ShieldCheck className="w-6 h-6" />
                  ) : profile.role === 'internal_agent' ? (
                    <UserCheck className="w-6 h-6" />
                  ) : (
                    <Building className="w-6 h-6" />
                  )}
                </div>

                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F8F7F3] text-[#B49453] border border-[#E8E5DD] inline-block mb-2">
                  {profile.role.replace('_', ' ')}
                </span>
                <h3 className="font-bold text-base text-[#142544] mb-1">{profile.full_name}</h3>
                <p className="text-xs text-[#6B7280] mb-4">Telp: {profile.phone}</p>

                <div className="pt-4 border-t border-[#E8E5DD] text-xs text-[#6B7280] space-y-1">
                  <div className="flex items-center gap-1.5 text-[#142544]">
                    <KeyRound className="w-3.5 h-3.5 text-[#B49453]" />
                    <span className="font-mono text-[11px]">ID: {profile.id}</span>
                  </div>
                  <span className="text-[11px] block text-[#6B7280]">Mode Simulasi Lokal</span>
                </div>
              </div>
            ))}
          </div>

          {/* Status Banner */}
          <div className="p-6 rounded-2xl bg-white border border-[#B49453] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#B49453] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#6B7280]">
                <strong className="text-[#142544] block mb-0.5">Fase Redesain Website Publik Selesai</strong>
                Tahap saat ini berfokus pada kesempurnaan website publik, kartu properti, dan visual identitas Navy-Gold. Dashboard internal agen & persetujuan listing siap dihubungkan pada tahap arsitektur berikutnya.
              </div>
            </div>

            <Link
              to="/katalog"
              className="px-5 py-2.5 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white font-bold text-xs whitespace-nowrap flex items-center gap-2 transition"
            >
              <span>Jelajahi Katalog Publik</span>
              <ArrowRight className="w-4 h-4 text-[#B49453]" />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};
