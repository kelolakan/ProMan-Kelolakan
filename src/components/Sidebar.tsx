import React from "react";
import {
  LayoutDashboard,
  FolderKanban,
  Trophy,
  Users,
  MessageSquare,
  Folder,
  TrendingUp,
  LogOut,
  Shield,
  Briefcase
} from "lucide-react";
import { TeamMember, UserRole } from "../types";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userMember: TeamMember | null;
  onLogout: () => void;
  sheetsConnected: boolean;
  sheetsId: string | null;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  userMember,
  onLogout,
  sheetsConnected,
  sheetsId
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Ringkasan proyek & analitik" },
    { id: "projects", label: "Projects", icon: Briefcase, desc: "Kelola semua proyek" },
    { id: "kanban", label: "Kanban Board", icon: FolderKanban, desc: "Pantau progres tugas tim" },
    { id: "points", label: "Riwayat Poin", icon: Trophy, desc: "Gamifikasi & performa tim" },
    { id: "team", label: "Team", icon: Users, desc: "Anggota tim & peran divisi" },
    { id: "messages", label: "Messages", icon: MessageSquare, desc: "Chat real-time kolaborasi" },
    { id: "files", label: "Files", icon: Folder, desc: "Penyimpanan Google Drive" },
    { id: "scurve", label: "S-Curve Reports", icon: TrendingUp, desc: "Analisis rencana vs realisasi" },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/20">
          ZT
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight text-white">ZonaTools</h1>
          <p className="text-xs text-slate-400">Project Management</p>
        </div>
      </div>

      {/* Cloud Status */}
      <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${sheetsConnected ? "bg-emerald-500 shadow-sm shadow-emerald-500/30" : "bg-amber-500"}`}></span>
          <span className="text-slate-300 font-medium">
            {sheetsConnected ? "Google Sheet Database" : "Offline Storage"}
          </span>
        </div>
        {sheetsConnected && sheetsId && (
          <a
            href={`https://docs.google.com/spreadsheets/d/${sheetsId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 hover:underline"
          >
            Buka Sheet
          </a>
        )}
      </div>

      {/* Nav Menu Items */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-start gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 text-left ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10 font-medium"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
              <div className="leading-none">
                <span className="block text-sm font-medium">{item.label}</span>
                <span className={`text-[10px] block mt-0.5 ${isActive ? "text-indigo-200" : "text-slate-500"}`}>
                  {item.desc}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Footer Account profile block */}
      {userMember && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-indigo-500/30">
              {userMember.name ? userMember.name.substring(0, 2).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate text-white block">
                  {userMember.name}
                </span>
                <span className="bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-[9px] px-1.5 py-0.5 rounded-full shrink-0 font-medium uppercase">
                  {userMember.points} Pts
                </span>
              </div>
              <span className="text-xs text-slate-400 truncate block">{userMember.email}</span>
              <span className="text-[10px] text-slate-500 block font-medium flex items-center gap-1">
                <Shield className="w-3 h-3 text-slate-500 shrink-0" />
                {userMember.role} • {userMember.division}
              </span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-slate-800/80 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700/50 hover:border-red-900/40 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Keluar Aplikasi
          </button>
        </div>
      )}
    </aside>
  );
}
