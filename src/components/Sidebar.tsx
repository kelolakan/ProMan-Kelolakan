import React from "react";
import {
  LayoutDashboard,
  Kanban,
  Award,
  Users,
  MessageSquare,
  Folder,
  TrendingUp,
  Briefcase,
  DollarSign,
  Shield,
  LogOut,
  KeyRound,
  Server
} from "lucide-react";
import { TeamMember, UserRole } from "../types";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userMember: TeamMember | null;
  onLogout: () => void;
  serverConnected?: boolean;
  onOpenChangePassword?: () => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  userMember,
  onLogout,
  serverConnected = true,
  onOpenChangePassword,
}: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, desc: "Ringkasan proyek & analitik" },
    { id: "projects", label: "Projects", icon: Briefcase, desc: "Kelola semua proyek" },
    { id: "finance", label: "Finance & Margin", icon: DollarSign, desc: "Kontrol anggaran & cashflow" },
    { id: "kanban", label: "Kanban Board", icon: Kanban, desc: "Pantau progres tugas tim" },
    { id: "points", label: "Riwayat Poin", icon: Award, desc: "Gamifikasi & performa tim" },
    { id: "team", label: "Team", icon: Users, desc: "Anggota tim & peran divisi" },
    { id: "messages", label: "Messages", icon: MessageSquare, desc: "Chat real-time kolaborasi" },
    { id: "files", label: "Files", icon: Folder, desc: "Penyimpanan berkas proyek" },
    { id: "scurve", label: "S-Curve Reports", icon: TrendingUp, desc: "Analisis rencana vs realisasi" },
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-100 flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/20 shrink-0">
          EX
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-base tracking-tight text-white truncate leading-snug">Exven Project</h1>
          <p className="text-xs text-indigo-400 font-medium">by Kelolakan</p>
        </div>
      </div>

      {/* Server Status Badge */}
      <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${serverConnected ? "bg-emerald-500 shadow-sm shadow-emerald-500/30 animate-pulse" : "bg-amber-500"}`}></span>
          <span className="text-slate-300 font-medium">
            {serverConnected ? "Server VPS Terhubung" : "Server Terputus"}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          {serverConnected ? "Online" : "Offline"}
        </span>
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
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-slate-400"}`} />
              <div className="text-left">
                <span className="text-sm block">{item.label}</span>
                <span
                  className={`text-[10px] block leading-tight ${
                    isActive ? "text-indigo-200" : "text-slate-500"
                  }`}
                >
                  {item.desc}
                </span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Active User Footer Section */}
      {userMember && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-indigo-400 border border-indigo-500/30 shrink-0">
              {userMember.name ? userMember.name.substring(0, 2).toUpperCase() : "EX"}
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
                {userMember.role}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenChangePassword && (
              <button
                onClick={onOpenChangePassword}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/50 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer"
                title="Ganti Password Akun"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Ganti Sandi</span>
              </button>
            )}
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800/80 hover:bg-red-950/40 text-slate-300 hover:text-red-400 border border-slate-700/50 hover:border-red-900/40 rounded-lg text-xs font-semibold transition-colors duration-150 cursor-pointer"
              title="Keluar dari akun ini"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
