import React, { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { userRepository } from '@/src/repositories/userRepository';
import { userManagement, ManagedUser } from '@/src/lib/userManagement';
import { isValidUsername, normalizeUsername, usernameToAuthEmail } from '@/src/lib/usernameAuth';
import { Profile, Role } from '@/src/types';
import { KeyRound, Plus, ShieldCheck, X } from 'lucide-react';

const ROLES: Array<{ value: Role; label: string }> = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'internal_agent', label: 'Agen Internal' },
  { value: 'partner_agent', label: 'Agen Mitra' },
];

const roleLabel = (role: Role) => ROLES.find(option => option.value === role)?.label || role;

const demoUserToManagedUser = (profile: Profile): ManagedUser => ({
  id: profile.id,
  username: profile.username || profile.email.split('@')[0],
  full_name: profile.full_name,
  phone: profile.phone,
  role: profile.role,
  created_at: profile.joined_at,
});

export const AgentManagementPage: React.FC = () => {
  const { currentUser, isSuperAdmin, isDemoMode, refreshDemoProfiles } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<ManagedUser | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('internal_agent');
  const [newPassword, setNewPassword] = useState('');

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedUsers = isDemoMode
        ? userRepository.findAll().map(demoUserToManagedUser)
        : await userManagement.list();
      setUsers(loadedUsers);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Daftar user gagal dimuat.');
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedUsername = normalizeUsername(username);
    if (!isValidUsername(normalizedUsername)) {
      setError('Username harus 3–32 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.');
      return;
    }
    if (password.length < 12) {
      setError('Password minimal 12 karakter.');
      return;
    }
    if (!fullName.trim()) {
      setError('Nama lengkap wajib diisi.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (isDemoMode) {
        const duplicateUsername = users.some(user => user.username.toLowerCase() === normalizedUsername);
        if (duplicateUsername) throw new Error('Username sudah digunakan.');
        const created = userRepository.create({
          username: normalizedUsername,
          full_name: fullName.trim(),
          email: usernameToAuthEmail(normalizedUsername),
          phone: phone.trim(),
          role,
          status: 'active',
        });
        refreshDemoProfiles();
        setUsers(current => [...current, demoUserToManagedUser(created)]);
        setNotice('User demo dibuat. Password tidak disimpan dalam mode demo.');
      } else {
        await userManagement.create({
          username: normalizedUsername,
          password,
          fullName: fullName.trim(),
          phone: phone.trim(),
          role,
        });
        await loadUsers();
        setNotice('User berhasil dibuat. Berikan username dan password sementara kepada user dengan aman.');
      }
      setIsCreateOpen(false);
      setUsername('');
      setPassword('');
      setFullName('');
      setPhone('');
      setRole('internal_agent');
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'User gagal dibuat.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRoleChange = async (user: ManagedUser, nextRole: Role) => {
    if (user.id === currentUser.id || user.role === nextRole) return;
    setError(null);
    setNotice(null);
    try {
      if (isDemoMode) {
        userRepository.updateRole(user.id, nextRole);
      } else {
        await userManagement.updateRole(user.id, nextRole);
      }
      setUsers(current => current.map(item => item.id === user.id ? { ...item, role: nextRole } : item));
      setNotice(`Role ${user.username} diubah menjadi ${roleLabel(nextRole)}.`);
    } catch (roleError) {
      setError(roleError instanceof Error ? roleError.message : 'Role user gagal diperbarui.');
    }
  };

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resetTarget) return;
    if (newPassword.length < 12) {
      setError('Password minimal 12 karakter.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (!isDemoMode) await userManagement.resetPassword(resetTarget.id, newPassword);
      setResetTarget(null);
      setNewPassword('');
      setNotice(isDemoMode
        ? 'Mode demo tidak menyimpan password.'
        : `Password untuk ${resetTarget.username} berhasil diubah.`);
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : 'Password user gagal diperbarui.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <DashboardLayout title="Kelola User" subtitle="Akses khusus super admin">
        <div className="mx-auto max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center">
          <ShieldCheck className="mx-auto mb-3 h-12 w-12 text-rose-500" />
          <h3 className="font-bold text-base text-[#142544]">Hak Akses Dibatasi</h3>
          <p className="mt-1 text-xs text-[#6B7280]">Hanya super admin yang dapat membuat user atau mengubah role.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Kelola User"
      subtitle="Buat akun dengan username dan password, lalu atur role akses aplikasi."
      actionButton={(
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-[#142544] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0B1730]"
        >
          <Plus className="h-4 w-4 text-[#B49453]" />
          <span>Tambah User</span>
        </button>
      )}
    >
      <div className="space-y-5">
        {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{notice}</div>}
        {isDemoMode && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            Mode demo: perubahan user hanya tersimpan di browser ini. Gunakan Supabase yang sudah dikonfigurasi untuk membuat akun login sungguhan.
          </div>
        )}

        {isLoading ? (
          <p role="status" className="rounded-xl border border-[#E8E5DD] bg-white p-8 text-center text-sm text-[#6B7280]">Memuat daftar user...</p>
        ) : users.length === 0 ? (
          <p className="rounded-xl border border-[#E8E5DD] bg-white p-8 text-center text-sm text-[#6B7280]">Belum ada user.</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[#E8E5DD] bg-white shadow-xs">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-[#F8F7F3] text-[10px] uppercase tracking-wide text-[#6B7280]">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Telepon</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Dibuat</th>
                  <th className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E5DD]">
                {users.map(user => {
                  const isCurrentUser = user.id === currentUser.id;
                  return (
                    <tr key={user.id} className="text-[#142544]">
                      <td className="px-4 py-3 font-semibold">
                        @{user.username}
                        {isCurrentUser && <span className="ml-1 text-[9px] text-[#80652F]">(Anda)</span>}
                      </td>
                      <td className="px-4 py-3">{user.full_name}</td>
                      <td className="px-4 py-3">{user.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          disabled={isCurrentUser}
                          onChange={event => void handleRoleChange(user, event.target.value as Role)}
                          aria-label={`Role ${user.username}`}
                          className="rounded-lg border border-[#E8E5DD] bg-white px-2 py-1 text-[10px] disabled:bg-[#F8F7F3] disabled:text-[#6B7280]"
                        >
                          {ROLES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">
                        {new Date(user.created_at).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setResetTarget(user);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#E8E5DD] px-2 py-1 font-semibold hover:border-[#B49453]"
                        >
                          <KeyRound className="h-3 w-3" />
                          Reset password
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form onSubmit={event => void handleCreateUser(event)} className="w-full max-w-md space-y-3 rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#142544]">Tambah User</h3>
                <p className="mt-1 text-[10px] text-[#6B7280]">Tidak memerlukan alamat email.</p>
              </div>
              <button type="button" disabled={isSaving} onClick={() => setIsCreateOpen(false)} aria-label="Tutup" className="text-[#6B7280] hover:text-[#142544]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs font-semibold">Username *
              <input required minLength={3} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}" autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} className="mt-1 w-full rounded-xl border border-[#E8E5DD] px-3 py-2 font-normal" placeholder="contoh: agen.jember" />
            </label>
            <label className="block text-xs font-semibold">Password awal *
              <input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#E8E5DD] px-3 py-2 font-normal" placeholder="Minimal 12 karakter" />
            </label>
            <label className="block text-xs font-semibold">Nama lengkap *
              <input required maxLength={120} value={fullName} onChange={event => setFullName(event.target.value)} className="mt-1 w-full rounded-xl border border-[#E8E5DD] px-3 py-2 font-normal" />
            </label>
            <label className="block text-xs font-semibold">Nomor telepon
              <input maxLength={32} value={phone} onChange={event => setPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-[#E8E5DD] px-3 py-2 font-normal" />
            </label>
            <label className="block text-xs font-semibold">Role *
              <select value={role} onChange={event => setRole(event.target.value as Role)} className="mt-1 w-full rounded-xl border border-[#E8E5DD] bg-white px-3 py-2 font-normal">
                {ROLES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <p className="text-[10px] leading-relaxed text-[#6B7280]">
              Username menjadi nama login. Password hanya ditampilkan saat dibuat; berikan kepada user dengan aman.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" disabled={isSaving} onClick={() => setIsCreateOpen(false)} className="rounded-xl border border-[#E8E5DD] px-3 py-2 text-xs font-semibold text-[#6B7280]">Batal</button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-[#142544] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {isSaving ? 'Membuat user...' : 'Buat User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <form onSubmit={event => void handleResetPassword(event)} className="w-full max-w-sm space-y-4 rounded-2xl border border-[#E8E5DD] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#142544]">Reset password</h3>
                <p className="mt-1 text-xs text-[#6B7280]">User @{resetTarget.username}</p>
              </div>
              <button type="button" disabled={isSaving} onClick={() => setResetTarget(null)} aria-label="Tutup" className="text-[#6B7280]">
                <X className="h-4 w-4" />
              </button>
            </div>
            <label className="block text-xs font-semibold">Password baru *
              <input required minLength={12} maxLength={128} type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#E8E5DD] px-3 py-2 font-normal" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" disabled={isSaving} onClick={() => setResetTarget(null)} className="rounded-xl border border-[#E8E5DD] px-3 py-2 text-xs font-semibold">Batal</button>
              <button type="submit" disabled={isSaving} className="rounded-xl bg-[#142544] px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
                {isSaving ? 'Menyimpan...' : 'Simpan password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </DashboardLayout>
  );
};
