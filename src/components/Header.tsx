import React from "react";
import { Project, TeamMember, UserRole } from "../types";
import { Server, Database, FolderDot, LogIn, CheckCircle2 } from "lucide-react";

interface HeaderProps {
  currentTab: string;
  projects: Project[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  serverConnected?: boolean;
  onOpenLoginModal?: () => void;
  userMember: TeamMember | null;
}

export default function Header({
  currentTab,
  projects,
  activeProjectId,
  setActiveProjectId,
  serverConnected = true,
  onOpenLoginModal,
  userMember
}: HeaderProps) {
  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Tab translations
  const tabTitles: { [key: string]: { title: string; subtitle: string } } = {
    dashboard: { title: "Dashboard Analitik", subtitle: "Ikhtisar progres proyek, performa poin, dan status pekerjaan tim." },
    projects: { title: "Daftar Proyek", subtitle: "Kelola, pantau, dan organisasikan semua inisiatif pekerjaan divisi PT. Exven Mitra Solusindo." },
    finance: { title: "Kontrol Finansial & Margin", subtitle: "Monitor nilai proyek, target margin, arus kas uang masuk/keluar, dan Kurva S finansial." },
    kanban: { title: "Kanban Board Pekerjaan", subtitle: "Manajemen visual tugas dengan pelacakan waktu kerja tim real-time." },
    points: { title: "Riwayat Poin", subtitle: "Catatan produktivitas dan kontribusi performa tim lapangan & perizinan." },
    team: { title: "Manajemen Tim", subtitle: "Daftar anggota tim, role akses divisi, dan hak administrasi sistem." },
    messages: { title: "Diskusi Kolaborasi", subtitle: "Komunikasi dan koordinasi langsung di dalam tim proyek internal." },
    files: { title: "File & Dokumentasi", subtitle: "Unggah dokumen perizinan, kurva S, dan foto lapangan ke server." },
    scurve: { title: "Laporan Kurva S", subtitle: "Visualisasi perbandingan kemajuan rencana terhadap realisasi aktual." },
  };

  const activeTitle = tabTitles[currentTab] || { title: "Exven Project Management", subtitle: "Sistem Manajemen Proyek Mandiri" };

  return (
    <header className="h-20 bg-white border-b border-gray-100 px-8 flex items-center justify-between shrink-0">
      {/* Title Block */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">{activeTitle.title}</h2>
        <p className="text-xs text-gray-500 mt-0.5 truncate">{activeTitle.subtitle}</p>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center gap-4">
        {/* Project Selector Context */}
        {projects.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100/80 rounded-xl px-3.5 py-1.5 shadow-sm shadow-slate-100/20">
            <FolderDot className="w-4.5 h-4.5 text-indigo-600" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aktif:</span>
            <select
              value={activeProjectId}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none focus:ring-0 cursor-pointer pr-1"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.division})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Server & Database Connection Status */}
        {serverConnected ? (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200/60 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="hidden sm:inline">Database Server Terhubung</span>
            <span className="sm:hidden">Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-xl border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span>Mode Tamu</span>
            </div>
            {onOpenLoginModal && (
              <button
                onClick={onOpenLoginModal}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Masuk Akun</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
