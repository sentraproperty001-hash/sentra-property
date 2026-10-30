import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { userRepository } from '@/src/repositories/userRepository';
import { Property, PropertyStatus, Profile } from '@/src/types';
import { PropertyFormModal } from './PropertyFormModal';
import {
  Building2,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Edit,
  Trash2,
  Send,
  AlertCircle,
  Archive,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';

const PROPERTY_FORM_STATE_KEY = 'sentra_property_form_state_v1';

interface PersistedPropertyFormState {
  userId: string;
  propertyId: string | null;
}

const getPropertyFormStorageKey = (userId: string) => `${PROPERTY_FORM_STATE_KEY}_${userId}`;

const restorePropertyFormState = (userId: string): PersistedPropertyFormState | null => {
  const storageKey = getPropertyFormStorageKey(userId);
  try {
    const storedState = localStorage.getItem(storageKey);
    if (!storedState) return null;

    const parsed: unknown = JSON.parse(storedState);
    if (
      typeof parsed === 'object'
      && parsed !== null
      && 'userId' in parsed
      && parsed.userId === userId
      && 'propertyId' in parsed
      && (typeof parsed.propertyId === 'string' || parsed.propertyId === null)
    ) {
      return { userId, propertyId: parsed.propertyId };
    }
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn('Failed to restore property form state:', error);
  }
  return null;
};

export const PropertyListingsManager: React.FC = () => {
  const { currentUser, isAdmin, isDemoMode } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Record<string, Profile>>({});
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [propertyFormState, setPropertyFormState] = useState<PersistedPropertyFormState | null>(
    () => restorePropertyFormState(currentUser.id)
  );

  const loadProperties = async () => {
    try {
      setLoadError(null);
      const [all, allAgents] = isDemoMode
        ? [propertyRepository.findAll(), userRepository.findAll()]
        : await Promise.all([
            propertyRepository.findManagedAsync(currentUser, isAdmin),
            userRepository.findAllAsync(),
          ]);
      setProperties(all);
      const map: Record<string, Profile> = {};
      allAgents.forEach(a => {
        map[a.id] = a;
      });
      setAgents(map);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat listing.');
    }
  };

  useEffect(() => {
    void loadProperties();
  }, [currentUser, isAdmin, isDemoMode]);

  useEffect(() => {
    const storageKey = getPropertyFormStorageKey(currentUser.id);
    const syncPropertyFormState = (event: StorageEvent) => {
      if (event.storageArea === localStorage && event.key === storageKey && event.newValue === null) {
        setPropertyFormState(null);
      }
    };
    window.addEventListener('storage', syncPropertyFormState);
    return () => window.removeEventListener('storage', syncPropertyFormState);
  }, [currentUser.id]);

  const savePropertyFormState = (state: PersistedPropertyFormState | null) => {
    const storageKey = getPropertyFormStorageKey(currentUser.id);
    try {
      if (state) localStorage.setItem(storageKey, JSON.stringify(state));
      else localStorage.removeItem(storageKey);
      setPropertyFormState(state);
      setLoadError(null);
    } catch (error) {
      console.error('Failed to persist property form state:', error);
      setLoadError('Status formulir listing tidak dapat disimpan di browser ini.');
      setPropertyFormState(state);
    }
  };

  const editingProperty = propertyFormState?.propertyId
    ? properties.find(property => property.id === propertyFormState.propertyId) || null
    : null;
  const isModalOpen = Boolean(
    propertyFormState && (!propertyFormState.propertyId || editingProperty)
  );

  // Role scoping:
  // Admins see all listings; Agents see their own listings by default, but can toggle to see all published
  const displayedProperties = properties.filter((p) => {
    // If agent, only show own listings in management, unless looking at all published
    const isOwner = p.owner_agent_id === currentUser.id;
    if (!isAdmin && !isOwner) {
      return false;
    }

    if (selectedStatus !== 'all' && p.status !== selectedStatus) {
      return false;
    }

    if (propertyTypeFilter !== 'all' && p.property_type !== propertyTypeFilter) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAddress = p.address.toLowerCase().includes(q);
      const matchDistrict = p.district.toLowerCase().includes(q);
      if (!matchTitle && !matchAddress && !matchDistrict) return false;
    }

    return true;
  });

  const handleOpenCreate = () => {
    savePropertyFormState({ userId: currentUser.id, propertyId: null });
  };

  const handleOpenEdit = (prop: Property) => {
    savePropertyFormState({ userId: currentUser.id, propertyId: prop.id });
  };

  const handleClosePropertyForm = () => {
    savePropertyFormState(null);
  };

  const handleDelete = async (prop: Property) => {
    if (confirm(`Yakin ingin menghapus listing "${prop.title}"?`)) {
      try {
        if (isDemoMode) propertyRepository.delete(prop.id, currentUser);
        else await propertyRepository.deleteAsync(prop.id, currentUser);
        await loadProperties();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Listing gagal dihapus.');
      }
    }
  };

  const handleSubmitReview = async (prop: Property) => {
    try {
      if (isDemoMode) propertyRepository.submitForReview(prop.id, currentUser);
      else await propertyRepository.setStatusAsync(prop.id, 'pending_review', currentUser);
      await loadProperties();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Listing gagal diajukan untuk review.');
    }
  };

  const handleArchive = async (prop: Property) => {
    if (confirm(`Arsipkan properti "${prop.title}"? Properti tidak akan tampil di website publik.`)) {
      try {
        if (isDemoMode) propertyRepository.archiveListing(prop.id, currentUser);
        else await propertyRepository.setStatusAsync(prop.id, 'archived', currentUser);
        await loadProperties();
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : 'Listing gagal diarsipkan.');
      }
    }
  };

  const statusTabs = [
    { id: 'all', label: 'Semua Status' },
    { id: 'published', label: 'Terbit (Publik)' },
    { id: 'pending_review', label: 'Menunggu Review' },
    { id: 'draft', label: 'Draf' },
    { id: 'rejected', label: 'Perlu Revisi' },
    { id: 'archived', label: 'Diarsipkan' },
  ];

  return (
    <DashboardLayout
      title="Kelola Listing Properti"
      subtitle={
        isAdmin
          ? 'Manajemen seluruh portofolio properti Sentra Property Jember'
          : `Listing terdaftar atas nama agen ${currentUser.full_name}`
      }
      actionButton={
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4 text-[#B49453]" />
          <span>Tambah Listing Baru</span>
        </button>
      }
    >
      <div className="space-y-5">
        {loadError && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {loadError}
          </div>
        )}
        {/* Top Filters & Tabs */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E5DD] shadow-xs space-y-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {statusTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                  selectedStatus === tab.id
                    ? 'bg-[#142544] text-white shadow-xs'
                    : 'bg-[#F8F7F3] text-[#6B7280] hover:text-[#142544] border border-[#E8E5DD]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Type filter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul, kecamatan, atau alamat properti..."
                className="w-full pl-9 pr-3 py-2 border border-[#E8E5DD] rounded-xl text-xs text-[#142544] focus:outline-none focus:ring-1 focus:ring-[#B49453]"
              />
            </div>

            <div>
              <select
                value={propertyTypeFilter}
                onChange={(e) => setPropertyTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl text-xs text-[#142544] focus:outline-none focus:ring-1 focus:ring-[#B49453]"
              >
                <option value="all">Semua Tipe Properti</option>
                <option value="rumah">Rumah</option>
                <option value="tanah">Tanah</option>
                <option value="ruko">Ruko</option>
                <option value="apartemen">Apartemen</option>
              </select>
            </div>
          </div>
        </div>

        {/* Listings List */}
        {displayedProperties.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-[#E8E5DD] shadow-xs">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#142544]">Tidak ada listing ditemukan</h3>
            <p className="text-xs text-[#6B7280] mt-1 max-w-sm mx-auto">
              Tidak ada properti yang cocok dengan filter yang dipilih. Tambahkan listing baru atau ubah kriteria pencarian.
            </p>
            <button
              onClick={handleOpenCreate}
              className="mt-4 px-4 py-2 rounded-xl bg-[#142544] text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-[#B49453]" />
              <span>Tambah Properti Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedProperties.map((prop) => {
              const agent = agents[prop.owner_agent_id];
              const isOwner = prop.owner_agent_id === currentUser.id;
              const canEdit = isAdmin || isOwner;

              return (
                <div
                  key={prop.id}
                  className="bg-white rounded-2xl border border-[#E8E5DD] overflow-hidden shadow-xs hover:border-[#B49453] transition flex flex-col"
                >
                  {/* Image & Badges */}
                  <div className="relative aspect-16/10 bg-gray-100 overflow-hidden">
                    {prop.image ? (
                      <img
                        src={prop.image}
                        alt={prop.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#6B7280]">
                        <Building2 className="w-8 h-8" />
                        <span className="text-[10px]">Foto belum tersedia</span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded shadow-xs ${
                          prop.status === 'published'
                            ? 'bg-emerald-600 text-white'
                            : prop.status === 'pending_review'
                            ? 'bg-[#B49453] text-[#142544]'
                            : prop.status === 'rejected'
                            ? 'bg-rose-600 text-white'
                            : prop.status === 'archived'
                            ? 'bg-gray-600 text-white'
                            : 'bg-gray-800 text-white'
                        }`}
                      >
                        {prop.status.replace('_', ' ')}
                      </span>
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#142544]/90 text-white shadow-xs">
                        {prop.listing_type}
                      </span>
                    </div>

                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-[#0B1730]/90 text-[#B49453] text-xs font-extrabold shadow-xs">
                      Rp {prop.price.toLocaleString('id-ID')}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-[#6B7280] mb-1">
                        <span className="font-semibold uppercase text-[#142544]">
                          {prop.property_type} • {prop.district}
                        </span>
                        <span>{new Date(prop.created_at).toLocaleDateString('id-ID')}</span>
                      </div>

                      <h3 className="font-bold text-xs text-[#142544] line-clamp-1 mb-1">
                        {prop.title}
                      </h3>

                      <p className="text-[11px] text-[#6B7280] line-clamp-2 mb-3">
                        {prop.address}
                      </p>

                      {/* Specs */}
                      <div className="flex items-center gap-2 text-[10px] text-[#142544] font-medium bg-[#F8F7F3] p-2 rounded-xl mb-3">
                        <span>LT {prop.land_area}m²</span>
                        <span>•</span>
                        <span>LB {prop.building_area}m²</span>
                        <span>•</span>
                        <span>{prop.bedrooms} KT</span>
                        <span>•</span>
                        <span>{prop.bathrooms} KM</span>
                      </div>

                      {/* Rejection notice if rejected */}
                      {prop.status === 'rejected' && prop.rejection_reason && (
                        <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[10px] text-rose-800 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-rose-600" />
                          <div>
                            <strong>Catatan Admin:</strong> "{prop.rejection_reason}"
                          </div>
                        </div>
                      )}

                      {/* Agent Tag */}
                      {isAdmin && agent && (
                        <div className="text-[10px] text-[#6B7280] mb-3">
                          Agen:{' '}
                          <span className="font-bold text-[#142544]">
                            {agent.full_name} ({agent.role.replace('_', ' ')})
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="pt-3 border-t border-[#E8E5DD] flex items-center justify-between gap-1.5 flex-wrap">
                      <div className="flex items-center gap-1">
                        {prop.status === 'published' && (
                          <a
                            href={`/detail/${prop.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-[#E8E5DD] hover:bg-[#F8F7F3] text-[#142544]"
                            title="Buka Halaman Publik"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}

                        {canEdit && (
                          <button
                            onClick={() => handleOpenEdit(prop)}
                            className="p-1.5 rounded-lg border border-[#E8E5DD] hover:bg-[#F8F7F3] text-[#142544]"
                            title="Edit Listing"
                            disabled={!isDemoMode && !isAdmin && prop.status === 'published'}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canEdit && isDemoMode && (
                          <button
                            onClick={() => handleDelete(prop)}
                            className="p-1.5 rounded-lg border border-[#E8E5DD] hover:bg-rose-50 text-rose-600"
                            title="Hapus Listing"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* State actions */}
                      <div className="flex items-center gap-1.5">
                        {(prop.status === 'draft' || prop.status === 'rejected') && (
                          <button
                            onClick={() => void handleSubmitReview(prop)}
                            className="px-2.5 py-1 rounded-lg bg-[#B49453] hover:bg-[#D8C596] text-[#142544] text-[10px] font-bold flex items-center gap-1 shadow-xs"
                          >
                            <Send className="w-3 h-3" />
                            <span>Ajukan Review</span>
                          </button>
                        )}

                        {prop.status === 'published' && canEdit && (
                          <button
                            onClick={() => void handleArchive(prop)}
                            className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[#6B7280] text-[10px] font-semibold flex items-center gap-1"
                          >
                            <Archive className="w-3 h-3" />
                            <span>Arsip</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PropertyFormModal
        isOpen={isModalOpen}
        onClose={handleClosePropertyForm}
        onSuccess={loadProperties}
        initialData={editingProperty}
      />
    </DashboardLayout>
  );
};
