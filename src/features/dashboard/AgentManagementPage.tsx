import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { userRepository } from '@/src/repositories/userRepository';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { Profile, Role } from '@/src/types';
import {
  UserCheck,
  ShieldCheck,
  Building,
  Plus,
  Phone,
  Mail,
  Calendar,
  KeyRound,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';

export const AgentManagementPage: React.FC = () => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [listingCounts, setListingCounts] = useState<Record<string, number>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Agent Form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('internal_agent');

  const loadData = () => {
    const list = userRepository.findAll();
    setProfiles(list);

    const props = propertyRepository.findAll();
    const counts: Record<string, number> = {};
    props.forEach((p) => {
      counts[p.owner_agent_id] = (counts[p.owner_agent_id] || 0) + 1;
    });
    setListingCounts(counts);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = (id: string, name: string) => {
    if (id === currentUser.id) {
      alert('Anda tidak dapat menonaktifkan akun Anda sendiri.');
      return;
    }
    userRepository.toggleStatus(id);
    loadData();
  };

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      alert('Semua bidang wajib diisi.');
      return;
    }

    userRepository.create({
      full_name: name,
      email,
      phone,
      role,
      status: 'active',
    });

    setIsAddModalOpen(false);
    setName('');
    setEmail('');
    setPhone('');
    setRole('internal_agent');
    loadData();
  };

  if (!isSuperAdmin) {
    return (
      <DashboardLayout
        title="Manajemen Tim & Agen"
        subtitle="Akses Khusus: Hanya Super Administrator"
      >
        <div className="bg-white p-8 rounded-2xl border border-red-200 text-center max-w-lg mx-auto">
          <ShieldCheck className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h3 className="font-bold text-base text-[#142544]">Hak Akses Dibatasi</h3>
          <p className="text-xs text-[#6B7280] mt-1">
            Hanya <strong>Super Admin</strong> yang memiliki hak kelola profil dan otorisasi tim agen. Gunakan menu ganti peran di pojok atas untuk beralih ke akun <strong>Budi Santoso (Super Admin)</strong>.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Manajemen Tim & Agen Resmi"
      subtitle="Otorisasi staf internal dan mitra agen Sentra Property Jember"
      actionButton={
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4 text-[#C9A34E]" />
          <span>Tambah Anggota Tim</span>
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((p) => {
            const count = listingCounts[p.id] || 0;
            const isMe = p.id === currentUser.id;

            return (
              <div
                key={p.id}
                className={`bg-white rounded-2xl p-5 border shadow-xs transition flex flex-col justify-between ${
                  p.status === 'active' ? 'border-[#E8E5DD] hover:border-[#C9A34E]' : 'border-red-200 bg-red-50/20'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#142544] text-[#C9A34E] flex items-center justify-center flex-shrink-0">
                        {p.role === 'super_admin' ? (
                          <ShieldCheck className="w-5 h-5" />
                        ) : p.role === 'admin' ? (
                          <UserCheck className="w-5 h-5" />
                        ) : (
                          <Building className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-[#142544]">
                          {p.full_name} {isMe && <span className="text-[10px] text-[#C9A34E]">(Anda)</span>}
                        </h4>
                        <span className="inline-block px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-[#C9A34E]/15 text-[#142544]">
                          {p.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.status === 'active' ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-[#6B7280] mb-4">
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#142544]" />
                      <span className="truncate">{p.email}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-[#142544]" />
                      <span>{p.phone}</span>
                    </p>
                    <p className="flex items-center gap-2 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-[#142544]" />
                      <span>Bergabung: {new Date(p.joined_at).toLocaleDateString('id-ID')}</span>
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#F8F7F3] border border-[#E8E5DD] flex items-center justify-between text-xs">
                    <span className="text-[#6B7280]">Total Portofolio Listing:</span>
                    <strong className="text-[#142544] font-bold">{count} Properti</strong>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[#E8E5DD] flex items-center justify-between text-xs">
                  <span className="font-mono text-[10px] text-gray-400">ID: {p.id}</span>
                  {!isMe && (
                    <button
                      onClick={() => handleToggleStatus(p.id, p.full_name)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                        p.status === 'active'
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {p.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Agent Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E8E5DD] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-[#142544]">Tambah Anggota Tim / Agen</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3 text-xs text-[#142544]">
              <div>
                <label className="block font-semibold mb-1">Nama Lengkap *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Farhan Alamsyah"
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Email Resmi *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="farhan@sentraproperty.id"
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Nomor Telepon / WA *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Peran / Role *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl focus:ring-1 focus:ring-[#C9A34E]"
                >
                  <option value="internal_agent">Internal Agent</option>
                  <option value="partner_agent">Partner Agent (Mitra)</option>
                  <option value="admin">Admin Reviewer</option>
                  <option value="super_admin">Super Admin</option>
                </select>
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
                  Simpan Anggota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
