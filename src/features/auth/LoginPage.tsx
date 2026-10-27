import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { BrandLogo } from '@/src/components/ui/BrandLogo';
import { ShieldCheck, UserCheck, Building, ArrowRight, Lock, UserRound, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { allProfiles, switchUser, login, currentUser, isDemoMode, isLoading, authError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || (!isDemoMode && !password)) {
      setError(isDemoMode ? 'Masukkan username demo.' : 'Masukkan username dan kata sandi akun.');
      return;
    }
    setError(null);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login gagal. Silakan coba lagi.');
    }
  };

  const handleSelectRole = (userId: string) => {
    if (!isDemoMode) return;
    switchUser(userId);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#F8F7F3] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-block mb-4">
          <BrandLogo variant="light" size="lg" />
        </div>
        <h2 className="text-2xl font-extrabold text-[#142544] tracking-tight">
          Portal Internal & Agen
        </h2>
        <p className="mt-1 text-xs text-[#6B7280]">
          Sentra Property — Sistem Manajemen Listing & Leads Terintegrasi Jember
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-white py-8 px-6 shadow-sm border border-[#E8E5DD] rounded-2xl sm:px-10">
          {/* Quick Demo Switcher Section */}
          {isDemoMode && <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#142544] uppercase tracking-wider">
                Pilih Akun Demo (1-Klik Masuk)
              </span>
              <span className="text-[11px] text-[#B49453] font-semibold bg-[#B49453]/10 px-2 py-0.5 rounded">
                Mock Mode Siap
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {allProfiles.map((profile) => {
                const isSelected = currentUser.id === profile.id;
                return (
                  <button
                    key={profile.id}
                    onClick={() => handleSelectRole(profile.id)}
                    className={`text-left p-3 rounded-xl border transition flex items-start gap-3 ${
                      isSelected
                        ? 'border-[#B49453] bg-[#B49453]/5 ring-1 ring-[#B49453]'
                        : 'border-[#E8E5DD] hover:border-[#142544] hover:bg-[#F8F7F3]'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#142544] text-[#B49453] flex items-center justify-center flex-shrink-0 mt-0.5">
                      {profile.role === 'super_admin' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : profile.role === 'internal_agent' ? (
                        <UserCheck className="w-4 h-4" />
                      ) : (
                        <Building className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-[#142544] truncate">{profile.full_name}</p>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#B49453]" />}
                      </div>
                      <p className="text-[10px] font-semibold text-[#B49453] uppercase tracking-wider">
                        {profile.role.replace('_', ' ')}
                      </p>
                      <p className="text-[10px] text-[#6B7280] truncate">
                        @{profile.username || profile.email.split('@')[0]}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>}

          {isDemoMode && <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E8E5DD]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-white text-[#6B7280]">atau login manual</span>
            </div>
          </div>}

          {(error || authError) && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
              {error || authError}
            </div>
          )}

          <form onSubmit={handleManualLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#142544] mb-1">
                {isDemoMode ? 'Username Demo' : 'Username'}
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B7280]">
                  <UserRound className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setError(null);
                  }}
                  placeholder={isDemoMode ? 'Pilih akun demo atau masukkan username' : 'Masukkan username Anda'}
                  className="block w-full pl-9 pr-3 py-2 border border-[#E8E5DD] rounded-xl text-xs text-[#142544] placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#B49453] focus:border-[#B49453]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#142544] mb-1">
                Kata Sandi
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#6B7280]">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  className="block w-full pl-9 pr-3 py-2 border border-[#E8E5DD] rounded-xl text-xs text-[#142544] focus:outline-none focus:ring-1 focus:ring-[#B49453] focus:border-[#B49453]"
                  autoComplete="current-password"
                  required={!isDemoMode}
                />
              </div>
              <span className="text-[10px] text-[#6B7280] mt-1 block">
                {isDemoMode ? '* Mode demo development tidak memakai kata sandi.' : 'Gunakan kata sandi akun Anda.'}
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#142544] hover:bg-[#0B1730] disabled:opacity-60 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{isLoading ? 'Memeriksa akun...' : 'Masuk ke Dashboard'}</span>
              <ArrowRight className="w-4 h-4 text-[#B49453]" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E8E5DD] flex items-center justify-between text-xs">
            <Link to="/" className="text-[#6B7280] hover:text-[#142544]">
              &larr; Kembali ke Beranda Publik
            </Link>
            <Link to="/katalog" className="text-[#B49453] font-semibold hover:underline">
              Katalog Properti
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
