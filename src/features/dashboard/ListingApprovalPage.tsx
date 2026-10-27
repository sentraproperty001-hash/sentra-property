import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { userRepository } from '@/src/repositories/userRepository';
import { Property, Profile } from '@/src/types';
import {
  CheckCircle,
  XCircle,
  ShieldCheck,
  Building2,
  Clock,
  User,
  ExternalLink,
  AlertTriangle,
  FileText,
  MapPin,
  Check,
  X,
} from 'lucide-react';

export const ListingApprovalPage: React.FC = () => {
  const { currentUser, isAdmin, isDemoMode } = useAuth();
  const [pendingListings, setPendingListings] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Record<string, Profile>>({});
  const [selectedForReject, setSelectedForReject] = useState<Property | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const loadPending = async () => {
    try {
      setActionErrorMessage(null);
      const [list, allAgents] = isDemoMode
        ? [propertyRepository.findPendingReview(), userRepository.findAll()]
        : await Promise.all([
            propertyRepository.findPendingReviewAsync(currentUser, isAdmin),
            userRepository.findAllAsync(),
          ]);
      setPendingListings(list);
      const map: Record<string, Profile> = {};
      allAgents.forEach((a) => {
        map[a.id] = a;
      });
      setAgents(map);
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Gagal memuat listing yang menunggu review.');
    }
  };

  useEffect(() => {
    void loadPending();
  }, [currentUser, isAdmin, isDemoMode]);

  const handleApprove = async (prop: Property) => {
    try {
      if (isDemoMode) propertyRepository.approveListing(prop.id, currentUser);
      else await propertyRepository.setStatusAsync(prop.id, 'published', currentUser);
      await loadPending();
      setActionSuccessMessage(`Listing "${prop.title}" berhasil disetujui dan kini telah TERBIT di website publik.`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Listing gagal disetujui.');
    }
  };

  const handleOpenReject = (prop: Property) => {
    setSelectedForReject(prop);
    setRejectionReason('Mohon perbaiki data kelengkapan foto dan nomor sertifikat kepemilikan.');
  };

  const handleConfirmReject = async () => {
    if (!selectedForReject || !rejectionReason.trim()) return;
    try {
      const property = selectedForReject;
      if (isDemoMode) propertyRepository.rejectListing(property.id, rejectionReason, currentUser);
      else await propertyRepository.setStatusAsync(property.id, 'rejected', currentUser, rejectionReason);
      await loadPending();
      setActionSuccessMessage(`Listing "${property.title}" ditolak. Alasan revisi telah diteruskan ke agen.`);
      setSelectedForReject(null);
      setRejectionReason('');
      setTimeout(() => setActionSuccessMessage(null), 5000);
    } catch (error) {
      setActionErrorMessage(error instanceof Error ? error.message : 'Listing gagal ditolak.');
    }
  };

  if (!isAdmin) {
    return (
      <DashboardLayout
        title="Persetujuan Listing"
        subtitle="Akses Terbatas: Hanya Administrator dan Reviewer"
      >
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-lg mx-auto">
          <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="font-bold text-base text-[#142544]">Hak Akses Dibatasi</h3>
          <p className="text-xs text-[#6B7280] mt-1">
            Akun Anda saat ini ({currentUser.role}) tidak memiliki izin persetujuan listing.
            {isDemoMode
              ? <> Silakan gunakan menu simulasi peran untuk beralih ke <strong>Super Admin</strong> atau <strong>Admin</strong>.</>
              : <> Hubungi administrator untuk meminta role yang sesuai.</>}
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Persetujuan & Verifikasi Listing"
      subtitle="Tinjau dan verifikasi listing properti yang diajukan agen sebelum dipublikasikan ke publik"
    >
      <div className="space-y-6">
        {actionErrorMessage && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {actionErrorMessage}
          </div>
        )}
        {/* Success Alert */}
        {actionSuccessMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 shadow-xs">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Counter Card */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E5DD] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B49453]/20 text-[#142544] flex items-center justify-center font-bold">
              <Clock className="w-5 h-5 text-[#B49453]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#142544]">
                {pendingListings.length} Listing Menunggu Keputusan
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Pastikan legalitas SHM/AJB valid dan harga wajar sesuai zona kecamatan Jember.
              </p>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {pendingListings.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-[#E8E5DD] shadow-xs">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#142544]">
              Semua listing telah diproses!
            </h3>
            <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
              Tidak ada listing baru yang sedang menunggu review. Agen dapat mengajukan listing baru dari menu Kelola Properti.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingListings.map((prop) => {
              const agent = agents[prop.owner_agent_id];

              return (
                <div
                  key={prop.id}
                  className="bg-white p-5 rounded-2xl border border-[#E8E5DD] shadow-xs hover:border-[#B49453] transition flex flex-col md:flex-row gap-5"
                >
                  {/* Photo */}
                  <div className="w-full md:w-64 aspect-16/10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                    {prop.image ? (
                      <img
                        src={prop.image}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#6B7280] text-xs">
                        Foto belum tersedia
                      </div>
                    )}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[#B49453] text-[#142544] text-[9px] font-extrabold uppercase">
                      Pending Review
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[#6B7280] mb-1">
                        <span className="font-bold uppercase text-[#B49453]">
                          {prop.property_type} • {prop.listing_type}
                        </span>
                        <span>Diajukan: {new Date(prop.updated_at).toLocaleString('id-ID')}</span>
                      </div>

                      <h3 className="text-base font-extrabold text-[#142544] mb-1">
                        {prop.title}
                      </h3>

                      <p className="text-sm font-extrabold text-[#B49453] mb-2">
                        Rp {prop.price.toLocaleString('id-ID')} {prop.listing_type === 'sewa' ? '/tahun' : ''}
                      </p>

                      <div className="flex items-center gap-1.5 text-xs text-[#6B7280] mb-3">
                        <MapPin className="w-3.5 h-3.5 text-[#142544] flex-shrink-0" />
                        <span>{prop.address}, {prop.district}, {prop.city}</span>
                      </div>

                      {/* Specs */}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#142544] font-medium bg-[#F8F7F3] p-2.5 rounded-xl mb-3">
                        <span>Luas Tanah: <strong>{prop.land_area} m²</strong></span>
                        <span>•</span>
                        <span>Luas Bangunan: <strong>{prop.building_area} m²</strong></span>
                        <span>•</span>
                        <span>{prop.bedrooms} Kamar Tidur</span>
                        <span>•</span>
                        <span>{prop.bathrooms} Kamar Mandi</span>
                        <span>•</span>
                        <span>Carport: {prop.parking_spaces}</span>
                      </div>

                      <p className="text-xs text-[#6B7280] line-clamp-2 mb-3">
                        {prop.description}
                      </p>

                      {/* Agent who submitted */}
                      {agent && (
                        <div className="flex items-center gap-2 text-xs text-[#142544] bg-blue-50/60 p-2 rounded-xl border border-blue-100">
                          <User className="w-4 h-4 text-blue-600 flex-shrink-0" />
                          <span>
                            Diajukan oleh:{' '}
                            <strong>{agent.full_name}</strong> ({agent.role.replace('_', ' ')}) • {agent.phone}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 mt-3 border-t border-[#E8E5DD] flex items-center justify-end gap-2.5">
                      <button
                        onClick={() => handleOpenReject(prop)}
                        className="px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold flex items-center gap-1.5 transition"
                      >
                        <X className="w-4 h-4" />
                        <span>Tolak / Minta Revisi</span>
                      </button>

                      <button
                        onClick={() => void handleApprove(prop)}
                        className="px-5 py-2 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                      >
                        <Check className="w-4 h-4 text-[#B49453]" />
                        <span>Setujui & Terbitkan ke Publik</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {selectedForReject && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E8E5DD] shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[#142544] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Tolak Listing / Minta Revisi</span>
              </h3>
              <button
                onClick={() => setSelectedForReject(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B7280] mb-3">
              Listing: <strong>{selectedForReject.title}</strong>
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#142544] mb-1">
                Catatan Revisi untuk Agen *
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan dan bagian yang perlu diperbaiki agen..."
                className="w-full p-2.5 border border-[#E8E5DD] rounded-xl text-xs text-[#142544] focus:outline-none focus:ring-1 focus:ring-[#B49453]"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedForReject(null)}
                className="px-3.5 py-1.5 rounded-xl border border-[#E8E5DD] text-xs font-semibold text-[#6B7280]"
              >
                Batal
              </button>
              <button
                onClick={() => void handleConfirmReject()}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
              >
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
