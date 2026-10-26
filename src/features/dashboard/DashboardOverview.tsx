import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { propertyRepository } from '@/src/repositories/propertyRepository';
import { leadRepository } from '@/src/repositories/leadRepository';
import { activityRepository } from '@/src/repositories/activityRepository';
import { userRepository } from '@/src/repositories/userRepository';
import { Property, Lead, ActivityLog } from '@/src/types';
import { PropertyFormModal } from './PropertyFormModal';
import {
  Building2,
  CheckCircle2,
  Clock,
  Users,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  History,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const { currentUser, isAdmin, isSuperAdmin } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [agentsCount, setAgentsCount] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadAll = () => {
    const allProps = propertyRepository.findAll();
    setProperties(allProps);

    const allLeads = leadRepository.findAll();
    setLeads(allLeads);

    const allActs = activityRepository.findAll();
    setActivities(allActs);

    const users = userRepository.findAll().filter(u => u.status === 'active');
    setAgentsCount(users.length);
  };

  useEffect(() => {
    loadAll();
  }, [currentUser]);

  // Role scoped calculations
  const myProps = isAdmin
    ? properties
    : properties.filter(p => p.owner_agent_id === currentUser.id);

  const pendingProps = properties.filter(p => p.status === 'pending_review');
  const publishedProps = myProps.filter(p => p.status === 'published');
  const draftProps = myProps.filter(p => p.status === 'draft');

  const myLeads = isAdmin
    ? leads
    : leads.filter(l => l.assigned_agent_id === currentUser.id || !l.assigned_agent_id);

  const newLeads = myLeads.filter(l => l.status === 'new');

  return (
    <DashboardLayout
      title="Ringkasan Operasional"
      subtitle={`Selamat datang kembali, ${currentUser.full_name} (${currentUser.role.replace('_', ' ').toUpperCase()})`}
      actionButton={
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition"
        >
          <Plus className="w-4 h-4 text-[#C9A34E]" />
          <span>Tambah Properti</span>
        </button>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Listing */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E5DD] shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                {isAdmin ? 'Total Listing' : 'Listing Saya'}
              </p>
              <h3 className="text-2xl font-extrabold text-[#142544] mt-1">
                {myProps.length}
              </h3>
              <p className="text-[10px] text-[#6B7280] mt-1">
                {publishedProps.length} Terbit • {draftProps.length} Draf
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#142544]/5 text-[#142544] flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Pending Approval */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E5DD] shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                Menunggu Review
              </p>
              <h3 className="text-2xl font-extrabold text-[#C9A34E] mt-1">
                {pendingProps.length}
              </h3>
              <p className="text-[10px] text-[#6B7280] mt-1">
                {isAdmin ? 'Perlu tindakan verifikasi' : 'Sedang diajukan ke admin'}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#C9A34E]/10 text-[#C9A34E] flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Total Leads */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E5DD] shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                {isAdmin ? 'Total Leads Masuk' : 'Leads Tertaut'}
              </p>
              <h3 className="text-2xl font-extrabold text-[#142544] mt-1">
                {myLeads.length}
              </h3>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                {newLeads.length} Prospek Baru
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Team or Success rate */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E5DD] shadow-xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider">
                {isSuperAdmin ? 'Anggota Tim Aktif' : 'Status Agen'}
              </p>
              <h3 className="text-2xl font-extrabold text-[#142544] mt-1">
                {isSuperAdmin ? agentsCount : 'Terverifikasi'}
              </h3>
              <p className="text-[10px] text-[#6B7280] mt-1">
                Wilayah Jember & Sekitarnya
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#142544]/5 text-[#C9A34E] flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Action Banner for Admins if there are pending reviews */}
        {isAdmin && pendingProps.length > 0 && (
          <div className="p-4 sm:p-5 rounded-2xl bg-[#C9A34E]/15 border border-[#C9A34E] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C9A34E] text-[#142544] flex items-center justify-center flex-shrink-0 font-bold">
                !
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#142544]">
                  Ada {pendingProps.length} Listing Menunggu Persetujuan Admin
                </h4>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  Tinjau kelengkapan foto, harga pasar wajar, dan status legalitas sertifikat sebelum diterbitkan ke katalog publik.
                </p>
              </div>
            </div>
            <Link
              to="/dashboard/approvals"
              className="px-4 py-2 rounded-xl bg-[#142544] hover:bg-[#0B1730] text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition"
            >
              <span>Buka Menu Persetujuan</span>
              <ArrowRight className="w-4 h-4 text-[#C9A34E]" />
            </Link>
          </div>
        )}

        {/* 2-Column Section: Recent Listings & Recent Leads */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Listings */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E5DD] shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#C9A34E]" />
                <h3 className="font-bold text-sm text-[#142544]">
                  {isAdmin ? 'Listing Terbaru' : 'Listing Saya'}
                </h3>
              </div>
              <Link
                to="/dashboard/properties"
                className="text-xs font-bold text-[#C9A34E] hover:underline flex items-center gap-1"
              >
                <span>Lihat Semua</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 flex-1">
              {myProps.slice(0, 4).map((prop) => (
                <div
                  key={prop.id}
                  className="p-3 rounded-xl border border-[#E8E5DD] hover:border-[#C9A34E] flex items-center gap-3 transition"
                >
                  <img
                    src={prop.image}
                    alt={prop.title}
                    className="w-14 h-14 rounded-lg object-cover flex-shrink-0 bg-gray-100"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          prop.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : prop.status === 'pending_review'
                            ? 'bg-amber-100 text-amber-800'
                            : prop.status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {prop.status.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        {prop.property_type.toUpperCase()} • {prop.listing_type.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#142544] truncate mt-1">
                      {prop.title}
                    </h4>
                    <p className="text-[11px] font-bold text-[#C9A34E]">
                      Rp {prop.price.toLocaleString('id-ID')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Leads */}
          <div className="bg-white p-5 rounded-2xl border border-[#E8E5DD] shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C9A34E]" />
                <h3 className="font-bold text-sm text-[#142544]">
                  Prospek Klien Masuk (Leads)
                </h3>
              </div>
              <Link
                to="/dashboard/leads"
                className="text-xs font-bold text-[#C9A34E] hover:underline flex items-center gap-1"
              >
                <span>Kelola Leads</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 flex-1">
              {myLeads.slice(0, 4).map((lead) => (
                <div
                  key={lead.id}
                  className="p-3 rounded-xl border border-[#E8E5DD] hover:border-[#142544] flex items-start justify-between gap-3 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                          lead.status === 'new'
                            ? 'bg-blue-100 text-blue-800 font-extrabold'
                            : lead.status === 'contacted'
                            ? 'bg-purple-100 text-purple-800'
                            : lead.status === 'qualified'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {lead.status}
                      </span>
                      <span className="text-[10px] text-[#6B7280]">
                        {new Date(lead.created_at).toLocaleDateString('id-ID')}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#142544] mt-1">
                      {lead.full_name}
                    </h4>
                    <p className="text-[11px] text-[#6B7280] line-clamp-1 mt-0.5">
                      "{lead.message}"
                    </p>
                    {lead.property_title && (
                      <p className="text-[10px] text-[#C9A34E] font-medium truncate mt-0.5">
                        Properti: {lead.property_title}
                      </p>
                    )}
                  </div>
                  <a
                    href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 flex-shrink-0"
                    title="Hubungi via WhatsApp"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Audit Activities Feed */}
        <div className="bg-white p-5 rounded-2xl border border-[#E8E5DD] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#C9A34E]" />
              <h3 className="font-bold text-sm text-[#142544]">
                Aktivitas & Log Keamanan Sistem
              </h3>
            </div>
            <Link
              to="/dashboard/activities"
              className="text-xs font-bold text-[#C9A34E] hover:underline flex items-center gap-1"
            >
              <span>Semua Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {activities.slice(0, 5).map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-xl bg-[#F8F7F3] border border-[#E8E5DD] flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#142544]">{act.user_name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-white text-[#C9A34E] border border-[#E8E5DD] font-semibold">
                      {act.user_role.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">
                      {new Date(act.created_at).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <p className="text-[#142544]">
                    <strong className="text-[#C9A34E] capitalize">{act.action.replace('_', ' ')}:</strong>{' '}
                    {act.entity_title} — {act.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <PropertyFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={loadAll}
      />
    </DashboardLayout>
  );
};
