import React, { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { useAuth } from '../auth/AuthContext';
import { activityRepository } from '@/src/repositories/activityRepository';
import { ActivityLog } from '@/src/types';
import {
  History,
  Search,
  Filter,
  ShieldCheck,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  FileText,
  RotateCcw,
} from 'lucide-react';

export const ActivityLogPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadLogs = () => {
    setActivities(activityRepository.findAll());
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const displayedLogs = activities.filter((act) => {
    if (filterAction !== 'all' && act.action !== filterAction) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUser = act.user_name.toLowerCase().includes(q);
      const matchTitle = act.entity_title.toLowerCase().includes(q);
      const matchDetails = (act.details || '').toLowerCase().includes(q);
      if (!matchUser && !matchTitle && !matchDetails) return false;
    }

    return true;
  });

  const getActionBadge = (action: ActivityLog['action']) => {
    switch (action) {
      case 'approve':
        return <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">DISETUJUI</span>;
      case 'reject':
        return <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">DITOLAK</span>;
      case 'submit_review':
        return <span className="px-2 py-0.5 rounded bg-[#C9A34E]/20 text-[#142544] text-[10px] font-bold">AJUKAN REVIEW</span>;
      case 'create':
        return <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">BUAT BARU</span>;
      case 'update':
        return <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">PERBARUI</span>;
      case 'delete':
        return <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">HAPUS</span>;
      case 'lead_contacted':
        return <span className="px-2 py-0.5 rounded bg-teal-100 text-teal-800 text-[10px] font-bold">LEAD DIHUBUNGI</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 text-[10px] font-bold">{action}</span>;
    }
  };

  return (
    <DashboardLayout
      title="Log Audit & Jejak Aktivitas"
      subtitle="Rekam jejak seluruh operasi penerbitan listing, approval, dan perubahan data"
    >
      <div className="space-y-5">
        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-[#E8E5DD] shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama staf, judul properti, atau rincian..."
              className="w-full pl-9 pr-3 py-2 border border-[#E8E5DD] rounded-xl text-xs text-[#142544] focus:outline-none focus:ring-1 focus:ring-[#C9A34E]"
            />
          </div>

          <div className="sm:w-56">
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border border-[#E8E5DD] rounded-xl text-xs text-[#142544] focus:outline-none focus:ring-1 focus:ring-[#C9A34E]"
            >
              <option value="all">Semua Jenis Aksi</option>
              <option value="create">Buat Properti</option>
              <option value="update">Update Properti</option>
              <option value="submit_review">Pengajuan Review</option>
              <option value="approve">Persetujuan Listing</option>
              <option value="reject">Penolakan Listing</option>
              <option value="delete">Hapus Data</option>
              <option value="lead_contacted">Follow-up Leads</option>
            </select>
          </div>
        </div>

        {/* Logs Timeline */}
        {displayedLogs.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-[#E8E5DD] shadow-xs">
            <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-[#142544]">Tidak ada catatan aktivitas</h3>
            <p className="text-xs text-[#6B7280] mt-1">
              Catatan aktivitas akan muncul otomatis saat Anda membuat properti, mengubah status, atau memproses persetujuan listing.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E8E5DD] shadow-xs overflow-hidden">
            <div className="divide-y divide-[#E8E5DD]">
              {displayedLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-[#F8F7F3] transition flex items-start justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getActionBadge(log.action)}
                      <span className="font-extrabold text-[#142544]">{log.user_name}</span>
                      <span className="text-[10px] text-[#C9A34E] font-semibold bg-[#C9A34E]/10 px-1.5 py-0.2 rounded uppercase">
                        {log.user_role.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-[#142544]">
                      Objek: <strong>{log.entity_title}</strong>
                    </p>

                    {log.details && (
                      <p className="text-[#6B7280] text-[11px] bg-white p-2 rounded-lg border border-[#E8E5DD] inline-block">
                        {log.details}
                      </p>
                    )}
                  </div>

                  <div className="text-right text-[10px] text-[#6B7280] whitespace-nowrap flex-shrink-0">
                    <Clock className="w-3 h-3 inline mr-1 text-[#C9A34E]" />
                    <span>{new Date(log.created_at).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
