import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { leadRepository } from '@/src/repositories/leadRepository';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { Lead, Property } from '@/src/types';
import {
  Users,
  MessageSquare,
  Phone,
  Mail,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Building,
  Edit2,
  Trash2,
  Save,
  X,
} from 'lucide-react';

export const LeadsManagerPage: React.FC = () => {
  const { currentUser, isAdmin, isDemoMode } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [tempNotes, setTempNotes] = useState('');

  // New Lead Form state
  const [newFullName, setNewFullName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newMessage, setNewMessage] = useState('');

  const loadData = async () => {
    setLoadError(null);
    try {
      const [allLeads, allProperties] = isDemoMode
        ? [leadRepository.findAll(), propertyRepository.findAll()]
        : await Promise.all([
            leadRepository.findAllAsync(),
            propertyRepository.findManagedAsync(currentUser, isAdmin),
          ]);
      const propertyTitles = new Map(allProperties.map(property => [property.id, property.title]));
      setLeads(allLeads.map(lead => ({
        ...lead,
        property_title: lead.property_id ? propertyTitles.get(lead.property_id) : undefined,
      })));
      setProperties(allProperties);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Gagal memuat pesan minat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [currentUser, isAdmin, isDemoMode]);

  // Role scoping:
  // Admins see all leads. Agents see leads assigned to them or unassigned leads.
  const displayedLeads = leads.filter((lead) => {
    if (!isAdmin && lead.assigned_agent_id && lead.assigned_agent_id !== currentUser.id) {
      return false;
    }

    if (selectedStatus !== 'all' && lead.status !== selectedStatus) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = lead.full_name.toLowerCase().includes(q);
      const matchPhone = lead.phone.toLowerCase().includes(q);
      const matchProp = (lead.property_title || '').toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchProp) return false;
    }

    return true;
  });

  const handleStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      if (isDemoMode) leadRepository.updateStatus(leadId, newStatus);
      else await leadRepository.updateStatusAsync(leadId, newStatus);
      await loadData();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Status pesan minat gagal diperbarui.');
    }
  };

  const handleStartEditNotes = (lead: Lead) => {
    setEditingNotesId(lead.id);
    setTempNotes(lead.notes || '');
  };

  const handleSaveNotes = async (leadId: string) => {
    leadRepository.updateNotes(leadId, tempNotes);
    setEditingNotesId(null);
    await loadData();
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (confirm(`Hapus data prospek atas nama ${name}?`)) {
      leadRepository.delete(id);
      await loadData();
    }
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newPhone) {
      alert('Nama dan Nomor Telepon wajib diisi.');
      return;
    }

    const matchedProp = properties.find((p) => p.id === newPropertyId);

    leadRepository.create({
      full_name: newFullName,
      phone: newPhone,
      email: newEmail || undefined,
      property_id: matchedProp?.id,
      property_title: matchedProp?.title,
      assigned_agent_id: currentUser.id,
      message: newMessage || 'Prospek dari survei lapangan / telepon langsung.',
      status: 'new',
    });

    setIsAddModalOpen(false);
    setNewFullName('');
    setNewPhone('');
    setNewEmail('');
    setNewPropertyId('');
    setNewMessage('');
    loadData();
  };

  const statusOptions: { value: Lead['status']; label: string; color: string }[] = [
    { value: 'new', label: 'Prospek Baru', color: 'bg-blue-100 text-blue-800' },
    { value: 'contacted', label: 'Sudah Dihubungi', color: 'bg-purple-100 text-purple-800' },
    { value: 'qualified', label: 'Survei / Kualifikasi', color: 'bg-amber-100 text-amber-800' },
    { value: 'closed', label: 'Deal Selesai', color: 'bg-emerald-100 text-emerald-800' },
  ];

  return (
    <DashboardLayout
      title="Manajemen Leads & Prospek"
      subtitle="Kelola minat calon pembeli/penyewa, jadwalkan survei, dan perbarui status follow-up"
      actionButton={
        isDemoMode ? (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
          >
            <Plus className="w-4 h-4 text-[#B49453]" />
            <span>Tambah Lead Manual</span>
          </button>
        ) : undefined
      }
    >
      <div className="space-y-5">
        {loadError && (
          <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {loadError}
          </div>
        )}
        {isLoading && (
          <div role="status" className="p-3 rounded-xl bg-white border border-[#E8E5DD] text-xs text-[#6B7280]">
            Memuat pesan minat...
          </div>
        )}
        {/* Top Filters */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E5DD] shadow-xs space-y-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedStatus === 'all'
                  ? 'bg-[#142544] text-white'
                  : 'bg-[#F8F7F3] text-[#6B7280] border border-[#E8E5DD]'
              }`}
            >
              Semua Leads ({leads.length})
            </button>
            {statusOptions.map((opt) => {
              const count = leads.filter((l) => l.status === opt.value).length;
              return (
                <button
                  key={opt.value}
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                    selectedStatus === opt.value
                      ? 'bg-[#142544] text-white'
                      : 'bg-[#F8F7F3] text-[#6B7280] border border-[#E8E5DD]'
                  }`}
                >
                  {opt.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama calon klien, nomor WhatsApp, atau judul properti..."
              className="w-full pl-9 pr-3 py-2 border border-[#E8E5DD] rounded-xl text-xs text-[#142544] focus:outline-none focus:ring-1 focus:ring-[#B49453]"
            />
          </div>
        </div>

        {/* Leads List */}
        {isLoading ? (
          <div role="status" className="bg-white p-12 text-center rounded-2xl border border-[#E8E5DD] shadow-xs text-xs text-[#6B7280]">
            Memuat pesan minat...
          </div>
        ) : displayedLeads.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-[#E8E5DD] shadow-xs">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#142544]">Belum ada data leads</h3>
            <p className="text-xs text-[#6B7280] mt-1">
              Semua pesan minat dari formulir detail properti website publik akan otomatis masuk ke sini.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedLeads.map((lead) => {
              const cleanPhone = lead.phone.replace(/[^0-9]/g, '');
              const waUrl = `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : cleanPhone}?text=${encodeURIComponent(
                `Halo Bapak/Ibu ${lead.full_name}, saya ${currentUser.full_name} dari Sentra Property Jember. Menindaklanjuti pesan Anda terkait ${lead.property_title || 'properti di Jember'}, ada yang bisa kami bantu?`
              )}`;

              const isEditingNotes = editingNotesId === lead.id;

              return (
                <div
                  key={lead.id}
                  className="bg-white p-5 rounded-2xl border border-[#E8E5DD] shadow-xs hover:border-[#B49453] transition flex flex-col md:flex-row justify-between gap-4"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                          lead.status === 'new'
                            ? 'bg-blue-100 text-blue-800'
                            : lead.status === 'contacted'
                            ? 'bg-purple-100 text-purple-800'
                            : lead.status === 'qualified'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {lead.status.toUpperCase()}
                      </span>

                      <span className="text-[10px] text-[#6B7280]">
                        Masuk: {new Date(lead.created_at).toLocaleString('id-ID')}
                      </span>
                    </div>

                    <h3 className="font-extrabold text-sm text-[#142544]">
                      {lead.full_name}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#6B7280]">
                      <span className="flex items-center gap-1 text-[#142544] font-semibold">
                        <Phone className="w-3.5 h-3.5 text-[#B49453]" />
                        <span>{lead.phone}</span>
                      </span>
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{lead.email}</span>
                        </span>
                      )}
                    </div>

                    {lead.property_title && (
                      <div className="p-2 rounded-xl bg-[#F8F7F3] border border-[#E8E5DD] text-xs text-[#142544] flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-[#B49453] flex-shrink-0" />
                        <span className="truncate">
                          Tertarik pada: <strong>{lead.property_title}</strong>
                        </span>
                      </div>
                    )}

                    <div className="p-3 rounded-xl bg-gray-50 text-xs text-[#142544] italic border-l-2 border-[#B49453]">
                      "{lead.message}"
                    </div>

                    {/* Notes Follow-up section */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-[#6B7280]">Catatan Follow-up Agen:</span>
                        {isDemoMode && !isEditingNotes && (
                          <button
                            onClick={() => handleStartEditNotes(lead)}
                            className="text-[#B49453] hover:underline font-semibold flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>{lead.notes ? 'Ubah Catatan' : '+ Tambah Catatan'}</span>
                          </button>
                        )}
                      </div>

                      {isDemoMode && isEditingNotes ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={tempNotes}
                            onChange={(e) => setTempNotes(e.target.value)}
                            placeholder="Tuliskan hasil survei, jadwal visit, atau status penawaran..."
                            className="flex-1 px-3 py-1.5 border border-[#B49453] rounded-xl text-xs text-[#142544] focus:outline-none"
                          />
                          <button
                            onClick={() => handleSaveNotes(lead.id)}
                            className="px-3 py-1.5 bg-[#142544] text-white rounded-xl text-xs font-bold flex items-center gap-1"
                          >
                            <Save className="w-3.5 h-3.5 text-[#B49453]" />
                            <span>Simpan</span>
                          </button>
                          <button
                            onClick={() => setEditingNotesId(null)}
                            className="p-1.5 border border-[#E8E5DD] rounded-xl text-gray-500 hover:bg-gray-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : isDemoMode ? (
                        <p className="text-xs text-[#142544] font-medium">
                          {lead.notes ? lead.notes : <span className="text-gray-400 italic">Belum ada catatan follow-up</span>}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="flex md:flex-col justify-between items-end gap-3 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#E8E5DD]">
                    <div className="w-full sm:w-auto">
                      <label className="block text-[10px] font-bold text-[#6B7280] uppercase mb-1">
                        Ubah Status:
                      </label>
                      <select
                        value={lead.status}
                        onChange={(e) => void handleStatusChange(lead.id, e.target.value as Lead['status'])}
                        className="w-full px-2.5 py-1.5 border border-[#E8E5DD] rounded-xl text-xs font-bold text-[#142544] focus:ring-1 focus:ring-[#B49453]"
                      >
                        <option value="new">Prospek Baru</option>
                        <option value="contacted">Sudah Dihubungi</option>
                        <option value="qualified">Kualifikasi / Survei</option>
                        <option value="closed">Deal Selesai</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat WhatsApp</span>
                      </a>

                      {isAdmin && isDemoMode && (
                        <button
                          onClick={() => handleDeleteLead(lead.id, lead.full_name)}
                          className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                          title="Hapus Lead"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Add Lead Modal */}
      {isAddModalOpen && isDemoMode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E8E5DD] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#142544]">Tambah Prospek / Lead Manual</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-3 text-xs text-[#142544]">
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap Klien *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="Contoh: Bapak Irwan Santoso"
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Nomor WhatsApp *</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Email (Opsional)</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="klien@email.com"
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Properti Terkait (Opsional)</label>
                <select
                  value={newPropertyId}
                  onChange={(e) => setNewPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                >
                  <option value="">-- Tidak Terikat Properti Khusus --</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} (Rp {p.price.toLocaleString('id-ID')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Kebutuhan / Permintaan Klien</label>
                <textarea
                  rows={2}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Cari rumah 2 lantai budget 1M di Kaliwates..."
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#B49453]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-[#E8E5DD] text-[#6B7280] font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-[#142544] text-white font-bold"
                >
                  Simpan Prospek
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
