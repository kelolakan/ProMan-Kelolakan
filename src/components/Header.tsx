import React from "react";
import { Project, TeamMember, UserRole } from "../types";
import { Cloud, CloudOff, FolderDot, ArrowRight, ShieldCheck } from "lucide-react";

interface HeaderProps {
  currentTab: string;
  projects: Project[];
  activeProjectId: string;
  setActiveProjectId: (id: string) => void;
  sheetsConnected: boolean;
  onConnectSheets: () => void;
  isConnecting: boolean;
  userMember: TeamMember | null;
}

export default function Header({
  currentTab,
  projects,
  activeProjectId,
  setActiveProjectId,
  sheetsConnected,
  onConnectSheets,
  isConnecting,
  userMember
}: HeaderProps) {
  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Tab translations
  const tabTitles: { [key: string]: { title: string; subtitle: string } } = {
    dashboard: { title: "Dashboard Analitik", subtitle: "Ikhtisar progres, performa poin, dan ulasan analitik AI." },
    projects: { title: "Daftar Proyek", subtitle: "Kelola, pantau, dan organisasikan semua inisiatif pekerjaan divisi." },
    kanban: { title: "Kanban Board Pekerjaan", subtitle: "Manajemen visual tugas dengan pelacakan waktu real-time." },
    points: { title: "Riwayat Poin", subtitle: "Catatan produktivitas dan kontribusi performa tim." },
    team: { title: "Manajemen Tim", subtitle: "Atur role akses divisi dan hak administrasi sistem." },
    messages: { title: "Diskusi Kolaborasi", subtitle: "Komunikasi dan koordinasi langsung di dalam tim proyek." },
    files: { title: "File & Dokumentasi", subtitle: "Unggah materi referensi langsung ke penyimpanan Google Drive." },
    scurve: { title: "Laporan Kurva S", subtitle: "Visualisasi perbandingan kemajuan rencana terhadap realisasi aktual." },
  };

  const activeTitle = tabTitles[currentTab] || { title: "Project Management", subtitle: "Sistem Kolaborasi Tim Real-time" };

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

        {/* Sync / OAuth Connection Status */}
        {sheetsConnected ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100">
            <Cloud className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>Terhubung Google Workspace</span>
          </div>
        ) : (
          <button
            onClick={onConnectSheets}
            disabled={isConnecting}
            className="gsi-material-button text-xs shadow-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all duration-200 cursor-pointer"
          >
            {isConnecting ? (
              <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block", width: "16px", height: "16px" }}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            )}
            <span>{isConnecting ? "Menghubungkan..." : "Hubungkan Google Workspace"}</span>
          </button>
        )}
      </div>
    </header>
  );
}
