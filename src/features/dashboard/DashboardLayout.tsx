import React, { useState, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { BrandLogo } from '@/src/components/ui/BrandLogo';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { leadRepository } from '@/src/repositories/leadRepository';
import {
  LayoutDashboard,
  Building2,
  CheckSquare,
  Users,
  UserCheck,
  History,
  ExternalLink,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ShieldCheck,
  Building,
  Bell,
  Sparkles,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actionButton?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  actionButton,
}) => {
  const { currentUser, allProfiles, switchUser, isSuperAdmin, isAdmin, isDemoMode, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isDemoMode) {
      setPendingCount(propertyRepository.findPendingReview().length);
      setNewLeadsCount(leadRepository.findAll().filter(l => l.status === 'new').length);
    } else {
      setPendingCount(0);
      setNewLeadsCount(0);
    }
  }, [location.pathname, currentUser, isDemoMode]);

  const handleRoleChange = (userId: string) => {
    if (!isDemoMode) return;
    switchUser(userId);
    setRoleDropdownOpen(false);
  };

  const handleLogout = async () => {
    setLogoutError(null);
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Gagal keluar dari akun.');
    }
  };

  const navItems = [
    {
      to: '/dashboard',
      label: 'Ringkasan',
      icon: LayoutDashboard,
      exact: true,
      allowed: isDemoMode,
    },
    {
      to: '/dashboard/properties',
      label: 'Kelola Properti',
      icon: Building2,
      allowed: true,
    },
    {
      to: '/dashboard/approvals',
      label: 'Persetujuan Listing',
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : undefined,
      allowed: isAdmin,
    },
    {
      to: '/dashboard/leads',
      label: 'Manajemen Leads',
      icon: Users,
      badge: newLeadsCount > 0 ? newLeadsCount : undefined,
      allowed: isDemoMode,
    },
    {
      to: '/dashboard/agents',
      label: 'Tim & Agen',
      icon: UserCheck,
      allowed: isDemoMode && isSuperAdmin,
    },
    {
      to: '/dashboard/activities',
      label: 'Log Audit Aktivitas',
      icon: History,
      allowed: isDemoMode,
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7F3] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-[#142544] text-white p-4 flex items-center justify-between sticky top-0 z-50 border-b border-[#0B1730]">
        <BrandLogo variant="dark" size="sm" />
        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-white/10 text-[#C9A34E] text-xs font-bold flex items-center gap-1">
            <span className="truncate max-w-[90px]">{currentUser.full_name}</span>
            {isDemoMode && (
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                aria-label="Ganti role demo"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-white/10 text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar for Desktop */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#142544] text-white flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5">
          <div className="hidden md:block mb-6">
            <BrandLogo variant="dark" size="md" />
            <div className="mt-2 text-[10px] text-gray-400 font-medium tracking-wide uppercase">
              Management Portal • Jember
            </div>
          </div>

          {/* User profile card with Quick Role Switcher */}
          <div className="relative mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider font-semibold text-[#C9A34E]">
                {isDemoMode ? 'Akun Aktif (Simulasi)' : 'Akun Terverifikasi'}
              </span>
              {isDemoMode && (
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="text-[10px] text-gray-300 hover:text-white flex items-center gap-0.5 underline cursor-pointer"
                >
                  <span>Ganti Role</span>
                  <ChevronDown className="w-3 h-3 text-[#C9A34E]" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-[#C9A34E] text-[#142544] font-bold flex items-center justify-center flex-shrink-0">
                {currentUser.role === 'super_admin' ? (
                  <ShieldCheck className="w-5 h-5 text-[#142544]" />
                ) : currentUser.role === 'admin' ? (
                  <CheckSquare className="w-5 h-5 text-[#142544]" />
                ) : (
                  <Building className="w-5 h-5 text-[#142544]" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{currentUser.full_name}</p>
                <span className="inline-block px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase bg-[#C9A34E]/20 text-[#E0C477] border border-[#C9A34E]/40 mt-0.5">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
            </div>

            {/* Role dropdown modal/flyout */}
            {isDemoMode && roleDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-[#0B1730] border border-[#C9A34E]/30 rounded-xl shadow-xl p-2 z-50">
                <div className="text-[10px] font-bold text-gray-400 px-2 py-1 uppercase">
                  Pilih Simulasi Role:
                </div>
                {allProfiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleRoleChange(p.id)}
                    className={`w-full text-left p-2 rounded-lg text-xs transition flex items-center justify-between ${
                      currentUser.id === p.id
                        ? 'bg-[#C9A34E] text-[#142544] font-bold'
                        : 'text-gray-200 hover:bg-white/10'
                    }`}
                  >
                    <div>
                      <p className="text-xs truncate">{p.full_name}</p>
                      <p className={`text-[9px] uppercase ${currentUser.id === p.id ? 'text-[#142544]/80' : 'text-[#C9A34E]'}`}>
                        {p.role.replace('_', ' ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems
              .filter((item) => item.allowed)
              .map((item) => {
                const Icon = item.icon;
                const isActive = item.exact
                  ? location.pathname === item.to
                  : location.pathname.startsWith(item.to);

                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
                        isActive
                          ? 'bg-[#C9A34E] text-[#142544] font-bold shadow-sm'
                          : 'text-gray-300 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white leading-none">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-white/10 space-y-2">
          {logoutError && (
            <div role="alert" className="p-2 rounded-lg bg-red-500/10 border border-red-400/30 text-[10px] text-red-200">
              {logoutError}
            </div>
          )}
          <Link
            to="/"
            target="_blank"
            className="flex items-center justify-between px-3 py-2 rounded-xl text-xs text-gray-300 hover:text-white hover:bg-white/5 transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-[#C9A34E]" />
              <span>Lihat Website Publik</span>
            </span>
          </Link>
          <button
            onClick={() => void handleLogout()}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-red-300 hover:text-red-200 hover:bg-red-500/10 transition"
          >
            <span className="flex items-center gap-2">
              <LogOut className="w-4 h-4" />
              <span>Ganti / Keluar Akun</span>
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top Navbar */}
        <header className="bg-white border-b border-[#E8E5DD] px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sticky top-0 z-30">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#142544] tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[#6B7280] mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden lg:flex items-center gap-2 bg-[#F8F7F3] border border-[#E8E5DD] px-3 py-1.5 rounded-xl">
              {isDemoMode && <Sparkles className="w-3.5 h-3.5 text-[#C9A34E]" />}
              <span className="text-[11px] font-semibold text-[#142544]">
                Role: <strong className="text-[#C9A34E] uppercase">{currentUser.role.replace('_', ' ')}</strong>
              </span>
              {isDemoMode && (
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="text-[10px] text-[#142544] font-bold hover:underline ml-1"
                >
                  (Ubah)
                </button>
              )}
            </div>

            {actionButton}
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
